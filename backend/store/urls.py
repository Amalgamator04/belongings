from django.urls import path

from .views import categories, create_order, healthcheck, product_detail, product_list

urlpatterns = [
    path('', healthcheck, name='healthcheck'),
    path('api/products/', product_list, name='products'),
    path('api/products/<slug:slug>/', product_detail, name='product-detail'),
    path('api/categories/', categories, name='categories'),
    path('api/orders/', create_order, name='orders'),
]
