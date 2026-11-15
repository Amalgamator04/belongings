from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Category, Order, OrderItem, Product
from .serializers import CategorySerializer, OrderSerializer, ProductSerializer


@api_view(['GET'])
def healthcheck(request):
    return Response({'status': 'ok', 'message': 'Melt and Muse API is running.'})


@api_view(['GET'])
def categories(request):
    queryset = Category.objects.all()
    serializer = CategorySerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def product_list(request):
    queryset = Product.objects.select_related('category').all()
    serializer = ProductSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def product_detail(request, slug):
    queryset = Product.objects.select_related('category').all()
    product = get_object_or_404(queryset, slug=slug)
    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(['POST'])
def create_order(request):
    serializer = OrderSerializer(data=request.data)
    if serializer.is_valid():
        order = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
