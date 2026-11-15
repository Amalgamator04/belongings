from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Address, Category, NewsletterSubscriber, Order, OrderItem, Product

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name']
        read_only_fields = ['id']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.strip().lower()

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff']
        read_only_fields = ['id', 'username', 'is_staff']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(
            pk=getattr(self.instance, 'pk', None)
        ).exists():
            raise serializers.ValidationError('This email is already in use.')
        return value.strip().lower()


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        exclude = ['user']
        read_only_fields = ['id', 'created_at']


class NewsletterSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ['email']

    def validate_email(self, value):
        return value.strip().lower()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'accent', 'icon']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'category',
            'category_name',
            'short_description',
            'description',
            'price',
            'compare_price',
            'image',
            'gallery',
            'tags',
            'badge',
            'occasion',
            'stock',
            'is_featured',
            'is_available',
            'rating',
        ]


class AdminProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'slug',
            'category',
            'category_name',
            'short_description',
            'description',
            'price',
            'compare_price',
            'image',
            'gallery',
            'tags',
            'badge',
            'occasion',
            'stock',
            'is_featured',
            'is_available',
            'rating',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'category_name', 'created_at', 'updated_at']

    def validate(self, attrs):
        price = attrs.get('price', self.instance.price if self.instance else None)
        if price is None:
            raise serializers.ValidationError({
                'price': 'A customer-facing product must have a sale price.',
            })
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'product_name_snapshot',
            'quantity',
            'unit_price',
            'custom_message',
            'customization',
        ]


class OrderTrackingItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product_name_snapshot', 'quantity']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'customer_name',
            'email',
            'phone',
            'delivery_address',
            'subtotal',
            'shipping_charge',
            'total',
            'payment_status',
            'status',
            'status_label',
            'created_at',
            'items',
        ]


class OrderTrackingSerializer(serializers.ModelSerializer):
    items = OrderTrackingItemSerializer(many=True, read_only=True)
    tracking_status = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    is_cancelled = serializers.SerializerMethodField()

    def get_tracking_status(self, order):
        if order.status == 'placed' or order.status == 'cancelled':
            return 'pending'
        if order.status == 'delivered':
            return 'delivered'
        return 'taken'

    def get_status_label(self, order):
        if order.status == 'cancelled':
            return 'Order cancelled'
        return self.get_tracking_status(order).title()

    def get_is_cancelled(self, order):
        return order.status == 'cancelled'

    class Meta:
        model = Order
        fields = [
            'id',
            'created_at',
            'tracking_status',
            'status_label',
            'is_cancelled',
            'payment_status',
            'total',
            'items',
        ]


class OrderCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    delivery_address = serializers.CharField()
    items = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        max_length=50,
    )

    def validate_items(self, items):
        for item in items:
            quantity = item.get('quantity')
            if not isinstance(quantity, int) or isinstance(quantity, bool) or not 1 <= quantity <= 25:
                raise serializers.ValidationError('Each item quantity must be an integer from 1 to 25.')

            if 'product_id' in item:
                if not isinstance(item['product_id'], int) or isinstance(item['product_id'], bool):
                    raise serializers.ValidationError('Each product_id must be an integer.')
            elif 'custom_hamper' not in item:
                raise serializers.ValidationError('Each item must contain product_id or custom_hamper.')

        return items
