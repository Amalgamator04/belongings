from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Category, Order, OrderItem, Product


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='orders@example.test',
)
class OrderCreationTests(APITestCase):
    def setUp(self):
        category = Category.objects.create(name='Gift hampers', slug='gift-hampers')
        self.product = Product.objects.create(
            category=category,
            name='Rose Gift Box',
            slug='rose-gift-box',
            price=Decimal('500.00'),
            stock=5,
        )
        self.order_url = reverse('orders')
        self.customer = {
            'customer_name': 'Asha Customer',
            'email': 'asha@example.com',
            'delivery_address': '12 Rose Street, Bengaluru, 560001',
        }

    def test_order_uses_server_product_prices_and_saves_price_snapshot(self):
        response = self.client.post(
            self.order_url,
            {
                **self.customer,
                'items': [{
                    'product_id': self.product.pk,
                    'quantity': 2,
                    'price': '0.01',
                }],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get()
        item = OrderItem.objects.get(order=order)
        self.assertEqual(order.subtotal, Decimal('1000.00'))
        self.assertEqual(order.shipping_charge, Decimal('199.00'))
        self.assertEqual(order.total, Decimal('1199.00'))
        self.assertEqual(item.unit_price, Decimal('500.00'))
        self.assertEqual(item.product_name_snapshot, 'Rose Gift Box')
        self.assertEqual(response.data['confirmation_email_status'], 'sent')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['asha@example.com'])
        self.assertIn('Belongings', mail.outbox[0].subject)
        self.assertIn(f'order #{order.pk}', mail.outbox[0].subject.lower())
        self.assertIn('A little gifting magic is underway', mail.outbox[0].body)
        self.assertIn('YOUR DETAILS', mail.outbox[0].body)
        self.assertIn(self.customer['delivery_address'], mail.outbox[0].body)
        self.assertIn('Rose Gift Box × 2', mail.outbox[0].body)
        self.assertIn('track-order?token=', mail.outbox[0].body)

        tracking_response = self.client.get(
            reverse('track-order'),
            {'token': response.data['tracking_token']},
        )
        self.assertEqual(tracking_response.status_code, 200)
        self.assertEqual(tracking_response.data['tracking_status'], 'pending')
        self.assertEqual(tracking_response.data['status_label'], 'Pending')
        self.assertEqual(tracking_response.data['items'][0]['product_name_snapshot'], 'Rose Gift Box')
        self.assertNotIn('email', tracking_response.data)
        self.assertNotIn('delivery_address', tracking_response.data)
        self.assertNotIn('status', tracking_response.data)

        order.status = 'shipped'
        order.save(update_fields=['status'])
        tracking_response = self.client.get(
            reverse('track-order'),
            {'token': response.data['tracking_token']},
        )
        self.assertEqual(tracking_response.data['tracking_status'], 'taken')
        self.assertEqual(tracking_response.data['status_label'], 'Taken')

        order.status = 'delivered'
        order.save(update_fields=['status'])
        tracking_response = self.client.get(
            reverse('track-order'),
            {'token': response.data['tracking_token']},
        )
        self.assertEqual(tracking_response.data['tracking_status'], 'delivered')
        self.assertEqual(tracking_response.data['status_label'], 'Delivered')

    def test_invalid_tracking_token_does_not_reveal_order(self):
        response = self.client.get(reverse('track-order'), {'token': 'invalid'})

        self.assertEqual(response.status_code, 404)

    def test_custom_hamper_is_recalculated_from_database_prices(self):
        response = self.client.post(
            self.order_url,
            {
                **self.customer,
                'items': [{
                    'quantity': 1,
                    'custom_hamper': {
                        'hamper_type': 'Gift box',
                        'packaging': 'premium_box',
                        'products': [{'product_id': self.product.pk, 'quantity': 2}],
                        'personalisation': {'message': 'Happy birthday'},
                    },
                }],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get()
        item = OrderItem.objects.get(order=order)
        self.assertEqual(item.unit_price, Decimal('1248.00'))
        self.assertEqual(order.total, Decimal('1447.00'))
        self.assertEqual(item.customization['products'][0]['unit_price'], '500.00')
        self.assertIn('Premium gift box', mail.outbox[0].body)
        self.assertIn('Included items: Rose Gift Box × 2', mail.outbox[0].body)
        self.assertIn('Gift message: Happy birthday', mail.outbox[0].body)
        self.assertIn('Your order', mail.outbox[0].alternatives[0][0])

    def test_invalid_quantity_is_rejected(self):
        response = self.client.post(
            self.order_url,
            {
                **self.customer,
                'items': [{'product_id': self.product.pk, 'quantity': 0}],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_custom_hamper_cannot_exceed_its_selected_budget(self):
        response = self.client.post(
            self.order_url,
            {
                **self.customer,
                'items': [{
                    'quantity': 1,
                    'custom_hamper': {
                        'budget': '₹399–₹599',
                        'products': [{'product_id': self.product.pk, 'quantity': 2}],
                    },
                }],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_registration_returns_jwt_tokens(self):
        response = self.client.post(
            reverse('register'),
            {
                'username': 'asha',
                'email': 'asha@example.com',
                'password': 'A-strong-example-password-2026',
                'first_name': 'Asha',
                'last_name': 'Customer',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'asha@example.com')

    def test_newsletter_subscription_is_idempotent(self):
        url = reverse('newsletter')
        first = self.client.post(url, {'email': 'updates@example.com'}, format='json')
        second = self.client.post(url, {'email': 'UPDATES@example.com'}, format='json')

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)


class BuilderItemTests(APITestCase):
    def setUp(self):
        category = Category.objects.create(name='Girls accessories', slug='girls-accessories')
        self.item = Product.objects.create(
            category=category,
            name='Satin scrunchie',
            slug='builder-satin-scrunchie',
            price=None,
            stock=10,
            is_builder_only=True,
        )

    def test_builder_items_are_available_without_exposing_prices_or_shop_products(self):
        builder_response = self.client.get(reverse('builder-items'))
        shop_response = self.client.get(reverse('products'))

        self.assertEqual(builder_response.status_code, 200)
        self.assertEqual(builder_response.data[0]['name'], self.item.name)
        self.assertNotIn('price', builder_response.data[0])
        self.assertNotIn(self.item.pk, [product['id'] for product in shop_response.data['results']])

    def test_unpriced_builder_item_cannot_be_ordered(self):
        response = self.client.post(
            reverse('orders'),
            {
                'customer_name': 'Asha Customer',
                'email': 'asha@example.com',
                'delivery_address': '12 Rose Street, Bengaluru, 560001',
                'items': [{'product_id': self.item.pk, 'quantity': 1}],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())


class AdminOrderDashboardTests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username='store-admin',
            email='admin@example.com',
            password='A-strong-example-password-2026',
            is_staff=True,
        )

    def test_dashboard_and_order_list_are_staff_only(self):
        self.assertEqual(self.client.get(reverse('admin-dashboard')).status_code, 401)
        self.assertEqual(self.client.get(reverse('admin-orders')).status_code, 401)

        customer = get_user_model().objects.create_user(
            username='regular-customer',
            email='customer@example.com',
            password='A-strong-example-password-2026',
        )
        self.client.force_authenticate(customer)
        self.assertEqual(self.client.get(reverse('admin-dashboard')).status_code, 403)
        self.assertEqual(self.client.get(reverse('admin-orders')).status_code, 403)

    def test_dashboard_returns_filtered_metrics_and_graph_data(self):
        Order.objects.create(
            customer_name='Asha Customer',
            email='asha@example.com',
            delivery_address='1 Rose Street',
            subtotal=Decimal('500.00'),
            total=Decimal('699.00'),
            status='placed',
        )
        delivered = Order.objects.create(
            customer_name='Mira Customer',
            email='mira@example.com',
            delivery_address='2 Rose Street',
            subtotal=Decimal('900.00'),
            total=Decimal('1099.00'),
            status='delivered',
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get(
            reverse('admin-dashboard'),
            {'status': 'delivered', 'start_date': timezone.localdate().isoformat()},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_orders'], 1)
        self.assertEqual(response.data['completed_orders'], 1)
        self.assertEqual(response.data['total_order_value'], '1099.00')
        self.assertEqual(response.data['status_choices'][0]['value'], 'placed')
        self.assertEqual(response.data['daily_order_totals'][0]['orders'], 1)
        self.assertEqual(response.data['daily_order_totals'][0]['order_value'], '1099.00')
        self.assertEqual(Order.objects.get(pk=delivered.pk).status, 'delivered')


class AdminProductCatalogTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Gift hampers', slug='gift-hampers')
        self.product = Product.objects.create(
            category=self.category,
            name='Rose Gift Box',
            slug='rose-gift-box',
            price=Decimal('500.00'),
            stock=5,
        )
        self.admin = get_user_model().objects.create_user(
            username='catalog-admin',
            email='catalog-admin@example.com',
            password='A-strong-example-password-2026',
            is_staff=True,
        )

    def test_catalog_endpoints_are_staff_only(self):
        self.assertEqual(self.client.get(reverse('admin-products')).status_code, 401)
        self.assertEqual(self.client.get(reverse('admin-categories')).status_code, 401)

        customer = get_user_model().objects.create_user(
            username='catalog-customer',
            email='catalog-customer@example.com',
            password='A-strong-example-password-2026',
        )
        self.client.force_authenticate(customer)
        self.assertEqual(self.client.get(reverse('admin-products')).status_code, 403)
        self.assertEqual(self.client.get(reverse('admin-categories')).status_code, 403)

    def test_staff_can_filter_create_update_and_delete_products(self):
        builder_item = Product.objects.create(
            category=self.category,
            name='Satin scrunchie',
            slug='satin-scrunchie',
            price=None,
            is_builder_only=True,
        )
        self.client.force_authenticate(self.admin)

        listing = self.client.get(reverse('admin-products'), {'builder_only': 'true'})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual([item['id'] for item in listing.data['results']], [builder_item.pk])
        self.assertTrue(listing.data['results'][0]['is_builder_only'])

        created = self.client.post(
            reverse('admin-products'),
            {
                'name': 'Sage Gift Set',
                'slug': 'sage-gift-set',
                'category': self.category.pk,
                'price': '1250.00',
                'stock': 8,
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['price'], '1250.00')

        invalid = self.client.post(
            reverse('admin-products'),
            {
                'name': 'Unpriced Shop Product',
                'slug': 'unpriced-shop-product',
                'category': self.category.pk,
            },
            format='json',
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertIn('price', invalid.data)

        detail_url = reverse('admin-product-detail', args=[self.product.pk])
        updated = self.client.patch(
            detail_url,
            {'price': '550.00', 'is_available': False},
            format='json',
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['price'], '550.00')
        self.assertFalse(updated.data['is_available'])

        deleted = self.client.delete(detail_url)
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())

    def test_order_list_search_and_status_filters(self):
        matching = Order.objects.create(
            customer_name='Asha Customer',
            email='asha@example.com',
            delivery_address='1 Rose Street',
            status='placed',
        )
        Order.objects.create(
            customer_name='Mira Customer',
            email='mira@example.com',
            delivery_address='2 Rose Street',
            status='delivered',
        )
        self.client.force_authenticate(self.admin)

        response = self.client.get(
            reverse('admin-orders'),
            {'status': 'placed', 'search': 'asha'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], matching.pk)
