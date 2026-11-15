from django.contrib import admin

from .models import Address, Category, NewsletterSubscriber, Order, OrderItem, Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'is_builder_only', 'is_available')
    list_filter = ('category', 'is_builder_only', 'is_available')
    search_fields = ('name', 'slug')


admin.site.register(Address)
admin.site.register(Category)
admin.site.register(NewsletterSubscriber)
admin.site.register(Order)
admin.site.register(OrderItem)
