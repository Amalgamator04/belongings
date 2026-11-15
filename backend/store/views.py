from datetime import timedelta
from decimal import Decimal, InvalidOperation
import re
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotAuthenticated, NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Address, Category, NewsletterSubscriber, Order, OrderItem, Product
from .serializers import (
    AdminProductSerializer,
    AddressSerializer,
    BuilderItemSerializer,
    CategorySerializer,
    OrderCreateSerializer,
    OrderSerializer,
    OrderTrackingSerializer,
    NewsletterSerializer,
    ProfileSerializer,
    ProductSerializer,
    RegisterSerializer,
)
from .services import send_order_confirmation
from .tracking import issue_tracking_token, read_tracking_order_id

PACKAGING_PRICES = {
    'standard': Decimal('0.00'),
    'premium_box': Decimal('199.00'),
    'luxury_basket': Decimal('399.00'),
    'bouquet_wrap': Decimal('99.00'),
    'custom': Decimal('299.00'),
}
PERSONALISATION_CHARGE = Decimal('49.00')
DELIVERY_CHARGE = Decimal('199.00')


@api_view(['GET'])
def healthcheck(request):
    return Response({'status': 'ok', 'message': 'Belongings API is running.'})


@api_view(['POST'])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'user': ProfileSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    serializer = ProfileSerializer(
        request.user,
        data=request.data if request.method == 'PATCH' else None,
        partial=True,
    )
    if request.method == 'PATCH':
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(ProfileSerializer(request.user).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def addresses(request):
    if request.method == 'GET':
        serializer = AddressSerializer(request.user.addresses.all(), many=True)
        return Response(serializer.data)

    serializer = AddressSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    if serializer.validated_data.get('is_default'):
        request.user.addresses.update(is_default=False)
    address = serializer.save(user=request.user)
    return Response(AddressSerializer(address).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    queryset = Order.objects.prefetch_related('items')
    if not request.user.is_staff:
        queryset = queryset.filter(user=request.user)
    order = get_object_or_404(queryset, pk=order_id)
    return Response(OrderSerializer(order).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def track_order(request):
    token = request.query_params.get('token', '')
    if not token or len(token) > 4096:
        raise NotFound('This tracking link is invalid or has expired.')
    try:
        order_id = read_tracking_order_id(token)
    except signing.BadSignature:
        raise NotFound('This tracking link is invalid or has expired.')
    order = get_object_or_404(
        Order.objects.prefetch_related('items'),
        pk=order_id,
    )
    return Response(OrderTrackingSerializer(order).data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_order_status(request, order_id):
    order = get_object_or_404(Order, pk=order_id)
    new_status = request.data.get('status')
    allowed_statuses = {value for value, _ in Order.STATUS_CHOICES}
    if not isinstance(new_status, str) or new_status not in allowed_statuses:
        raise ValidationError({'status': 'Choose a valid order status.'})
    order.status = new_status
    order.save(update_fields=['status'])
    return Response(OrderSerializer(order).data)


def _filter_order_queryset(queryset, params):
    status_filter = params.get('status', '').strip()
    valid_statuses = {value for value, _ in Order.STATUS_CHOICES}
    if status_filter and status_filter != 'all':
        if status_filter not in valid_statuses:
            raise ValidationError({'status': 'Choose a valid order status.'})
        queryset = queryset.filter(status=status_filter)

    start_date = params.get('start_date', '').strip()
    end_date = params.get('end_date', '').strip()
    parsed_start = parse_date(start_date) if start_date else None
    parsed_end = parse_date(end_date) if end_date else None
    if start_date and parsed_start is None:
        raise ValidationError({'start_date': 'Use YYYY-MM-DD format.'})
    if end_date and parsed_end is None:
        raise ValidationError({'end_date': 'Use YYYY-MM-DD format.'})
    if parsed_start and parsed_end and parsed_start > parsed_end:
        raise ValidationError({'end_date': 'End date must be on or after the start date.'})
    if parsed_start:
        queryset = queryset.filter(created_at__date__gte=parsed_start)
    if parsed_end:
        queryset = queryset.filter(created_at__date__lte=parsed_end)

    search = params.get('search', '').strip()[:100]
    if search:
        search_filter = (
            Q(customer_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone__icontains=search)
        )
        if search.isdecimal():
            search_filter |= Q(pk=int(search))
        queryset = queryset.filter(search_filter)
    return queryset


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_orders(request):
    orders = _filter_order_queryset(
        Order.objects.prefetch_related('items').order_by('-created_at', '-pk'),
        request.query_params,
    )
    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(orders, request)
    return paginator.get_paginated_response(OrderSerializer(page, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_categories(request):
    categories = Category.objects.all().order_by('name')
    return Response(CategorySerializer(categories, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_products(request):
    if request.method == 'POST':
        serializer = AdminProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    products = Product.objects.select_related('category').all()
    search = request.query_params.get('search', '').strip()[:100]
    if search:
        products = products.filter(
            Q(name__icontains=search)
            | Q(slug__icontains=search)
            | Q(category__name__icontains=search)
        )
    category_id = request.query_params.get('category', '').strip()
    if category_id:
        if not category_id.isdecimal():
            raise ValidationError({'category': 'Choose a valid category.'})
        products = products.filter(category_id=int(category_id))
    builder_only = request.query_params.get('builder_only', '').strip().lower()
    if builder_only in {'true', 'false'}:
        products = products.filter(is_builder_only=(builder_only == 'true'))
    elif builder_only and builder_only != 'all':
        raise ValidationError({'builder_only': 'Choose true, false, or all.'})

    paginator = PageNumberPagination()
    paginator.page_size = 20
    page = paginator.paginate_queryset(products.order_by('name', 'pk'), request)
    return paginator.get_paginated_response(AdminProductSerializer(page, many=True).data)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_product_detail(request, product_id):
    product = get_object_or_404(
        Product.objects.select_related('category'),
        pk=product_id,
    )
    if request.method == 'GET':
        return Response(AdminProductSerializer(product).data)
    if request.method == 'PATCH':
        serializer = AdminProductSerializer(
            product,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    product.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    orders = _filter_order_queryset(Order.objects.all(), request.query_params)
    aggregates = orders.aggregate(
        total_orders=Count('id'),
        total_order_value=Sum('total'),
    )
    status_counts = {
        row['status']: row['count']
        for row in orders.values('status').annotate(count=Count('id'))
    }

    daily_orders = orders
    if not request.query_params.get('start_date') and not request.query_params.get('end_date'):
        chart_start = timezone.localdate() - timedelta(days=29)
        daily_orders = daily_orders.filter(created_at__date__gte=chart_start)
    daily_totals = daily_orders.annotate(day=TruncDate('created_at')).values('day').annotate(
        orders=Count('id'),
        order_value=Sum('total'),
    ).order_by('day')
    order_value = aggregates['total_order_value'] or Decimal('0.00')

    return Response({
        'total_orders': aggregates['total_orders'],
        'pending_orders': status_counts.get('placed', 0),
        'completed_orders': status_counts.get('delivered', 0),
        'total_order_value': str(order_value),
        'total_revenue': str(order_value),
        'status_choices': [
            {'value': value, 'label': label, 'count': status_counts.get(value, 0)}
            for value, label in Order.STATUS_CHOICES
        ],
        'daily_order_totals': [
            {
                'date': row['day'].isoformat(),
                'orders': row['orders'],
                'order_value': str(row['order_value'] or Decimal('0.00')),
            }
            for row in daily_totals
        ],
        'products': Product.objects.filter(
            is_builder_only=False,
            price__isnull=False,
        ).count(),
        'builder_items': Product.objects.filter(is_builder_only=True).count(),
        'low_stock_products': Product.objects.filter(
            is_builder_only=False,
            price__isnull=False,
            stock__lte=5,
        ).count(),
    })

@api_view(['GET'])
def categories(request):
    queryset = Category.objects.filter(
        products__is_available=True,
        products__is_builder_only=False,
        products__price__isnull=False,
    ).distinct().order_by('name')
    serializer = CategorySerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def subscribe_newsletter(request):
    serializer = NewsletterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    subscriber, created = NewsletterSubscriber.objects.get_or_create(
        email=serializer.validated_data['email']
    )
    return Response(
        {'email': subscriber.email, 'subscribed': True},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(['GET'])
def product_list(request):
    queryset = Product.objects.select_related('category').filter(
        is_available=True,
        is_builder_only=False,
        price__isnull=False,
    )
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(short_description__icontains=search)
            | Q(description__icontains=search)
        )

    category = request.query_params.get('category')
    if category:
        queryset = queryset.filter(
            Q(category__slug=category) | Q(category__name__iexact=category)
        )

    minimum = request.query_params.get('min_price')
    maximum = request.query_params.get('max_price')
    try:
        if minimum:
            queryset = queryset.filter(price__gte=Decimal(minimum))
        if maximum:
            queryset = queryset.filter(price__lte=Decimal(maximum))
    except (InvalidOperation, ValueError) as error:
        raise ValidationError({'price': 'Price filters must be valid amounts.'}) from error

    ordering = request.query_params.get('ordering', '-is_featured')
    if ordering in {'price', '-price', 'created_at', '-created_at', 'rating', '-rating', 'name'}:
        queryset = queryset.order_by(ordering, 'id')
    else:
        queryset = queryset.order_by('-is_featured', '-created_at', 'id')

    paginator = PageNumberPagination()
    paginator.page_size = 24
    page = paginator.paginate_queryset(queryset, request)
    return paginator.get_paginated_response(ProductSerializer(page, many=True).data)


@api_view(['GET'])
def product_detail_by_id(request, product_id):
    product = get_object_or_404(
        Product.objects.select_related('category'),
        pk=product_id,
        is_available=True,
        is_builder_only=False,
        price__isnull=False,
    )
    return Response(ProductSerializer(product).data)


@api_view(['GET'])
def builder_item_list(request):
    queryset = Product.objects.select_related('category').filter(
        is_available=True,
        is_builder_only=True,
    ).order_by('category__name', 'name')
    return Response(BuilderItemSerializer(queryset, many=True).data)


@api_view(['GET'])
def product_detail(request, slug):
    queryset = Product.objects.select_related('category').filter(
        is_builder_only=False,
        price__isnull=False,
    )
    product = get_object_or_404(queryset, slug=slug)
    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
def create_order(request):
    if request.method == 'GET':
        if not request.user.is_authenticated:
            raise NotAuthenticated()
        queryset = Order.objects.filter(user=request.user).prefetch_related('items').order_by('-created_at')
        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(OrderSerializer(page, many=True).data)

    serializer = OrderCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    with transaction.atomic():
        reserved_quantities = {}
        order_lines = []
        subtotal = Decimal('0.00')

        def reserve_product(product_id, quantity):
            product = Product.objects.select_for_update().filter(pk=product_id).first()
            if product is None or not product.is_available:
                raise ValidationError({'items': f'Product {product_id} is unavailable.'})
            if product.price is None:
                raise ValidationError({
                    'items': f'{product.name} is available for builder selection only and cannot be ordered yet.'
                })
            reserved = reserved_quantities.get(product_id, 0)
            if product.stock - reserved < quantity:
                raise ValidationError({'items': f'Not enough stock for {product.name}.'})
            reserved_quantities[product_id] = reserved + quantity
            return product

        for item in serializer.validated_data['items']:
            if 'product_id' in item:
                product = reserve_product(item['product_id'], item['quantity'])
                line_total = product.price * item['quantity']
                order_lines.append({
                    'product': product,
                    'product_name_snapshot': product.name,
                    'quantity': item['quantity'],
                    'unit_price': product.price,
                    'customization': {},
                    'custom_message': '',
                })
                subtotal += line_total
                continue

            custom = item['custom_hamper']
            if not isinstance(custom, dict):
                raise ValidationError({'items': 'Custom hamper details must be an object.'})
            selected_products = custom.get('products')
            packaging = custom.get('packaging', 'standard')
            if not isinstance(selected_products, list) or not selected_products:
                raise ValidationError({'items': 'A custom hamper must contain at least one product.'})
            if len(selected_products) > 25:
                raise ValidationError({'items': 'A custom hamper can contain at most 25 product lines.'})
            if not isinstance(packaging, str) or packaging not in PACKAGING_PRICES:
                raise ValidationError({'items': 'Choose a valid packaging option.'})

            custom_product_total = Decimal('0.00')
            product_snapshots = []
            hamper_quantity = item['quantity']
            for selected in selected_products:
                if not isinstance(selected, dict):
                    raise ValidationError({'items': 'Custom hamper products are invalid.'})
                product_id = selected.get('product_id')
                quantity = selected.get('quantity')
                if not isinstance(product_id, int) or isinstance(product_id, bool):
                    raise ValidationError({'items': 'Custom hamper product_id must be an integer.'})
                if not isinstance(quantity, int) or isinstance(quantity, bool) or not 1 <= quantity <= 25:
                    raise ValidationError({'items': 'Custom hamper quantities must be from 1 to 25.'})
                product = reserve_product(product_id, quantity * hamper_quantity)
                custom_product_total += product.price * quantity
                product_snapshots.append({
                    'product_id': product.pk,
                    'name': product.name,
                    'quantity': quantity,
                    'unit_price': str(product.price),
                })

            personalised = custom.get('personalisation', {})
            if not isinstance(personalised, dict):
                raise ValidationError({'items': 'Personalisation details are invalid.'})
            personalisation_charge = (
                PERSONALISATION_CHARGE
                if any(personalised.get(key) for key in (
                    'recipient',
                    'sender',
                    'message',
                    'card_message',
                    'preferred_colours',
                    'special_instructions',
                ))
                else Decimal('0.00')
            )
            line_total = custom_product_total + PACKAGING_PRICES[packaging] + personalisation_charge
            budget = str(custom.get('budget', ''))
            budget_values = re.findall(r'\d[\d,]*', budget)
            if budget_values and not budget.rstrip().endswith('+'):
                budget_limit = Decimal(budget_values[-1].replace(',', ''))
                if line_total > budget_limit:
                    raise ValidationError({'items': 'The custom hamper exceeds its selected budget.'})
            customization = {
                'occasion': str(custom.get('occasion', ''))[:80],
                'hamper_type': str(custom.get('hamper_type', 'Custom hamper'))[:80],
                'budget': str(custom.get('budget', ''))[:40],
                'theme': str(custom.get('theme', ''))[:80],
                'products': product_snapshots,
                'packaging': packaging,
                'packaging_charge': str(PACKAGING_PRICES[packaging]),
                'personalisation': {
                    key: str(personalised.get(key, ''))[:500]
                    for key in ('recipient', 'sender', 'message', 'card_message', 'preferred_colours', 'special_instructions')
                },
                'personalisation_charge': str(personalisation_charge),
            }
            order_lines.append({
                'product': None,
                'product_name_snapshot': customization['hamper_type'],
                'quantity': hamper_quantity,
                'unit_price': line_total,
                'customization': customization,
                'custom_message': customization['personalisation']['message'],
            })
            subtotal += line_total * hamper_quantity

        order = Order.objects.create(
            user=request.user if request.user.is_authenticated else None,
            customer_name=serializer.validated_data['customer_name'],
            email=serializer.validated_data['email'],
            phone=serializer.validated_data.get('phone', ''),
            delivery_address=serializer.validated_data['delivery_address'],
            subtotal=subtotal,
            shipping_charge=DELIVERY_CHARGE,
            total=subtotal + DELIVERY_CHARGE,
        )
        OrderItem.objects.bulk_create([
            OrderItem(order=order, **line)
            for line in order_lines
        ])

    tracking_token = issue_tracking_token(order.pk)
    tracking_url = (
        f'{settings.FRONTEND_BASE_URL}/track-order?'
        f'{urlencode({"token": tracking_token})}'
    )
    response_data = OrderSerializer(order).data
    response_data['tracking_token'] = tracking_token
    response_data['confirmation_email_status'] = (
        'sent' if send_order_confirmation(order, tracking_url=tracking_url) else 'failed'
    )
    return Response(response_data, status=status.HTTP_201_CREATED)
