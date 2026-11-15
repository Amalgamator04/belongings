from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    accent = models.CharField(max_length=20, default='#F8DDE7')
    icon = models.CharField(max_length=50, default='gift')

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    short_description = models.TextField(blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image = models.URLField(default='https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80')
    gallery = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    badge = models.CharField(max_length=40, default='Popular')
    occasion = models.CharField(max_length=80, default='Birthday')
    stock = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    rating = models.FloatField(default=4.8)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Order(models.Model):
    customer_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    delivery_address = models.TextField()
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=40, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Order #{self.id} - {self.customer_name}'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='order_items', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    custom_message = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'
