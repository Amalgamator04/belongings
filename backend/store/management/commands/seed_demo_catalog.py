from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from store.models import Category, Product


CATEGORY_DATA = [
    ('Chocolate gifts', 'chocolate-gifts', 'Treats and chocolate gifts', '#E9D8D2', 'gift'),
    ('Beauty accessories', 'beauty-accessories', 'Beauty and self-care gifts', '#B9A2A0', 'sparkles'),
    ('Plush toys', 'plush-toys', 'Soft and cuddly gifts', '#F5EFE6', 'heart'),
    ('Korean aesthetic gifts', 'korean-aesthetic-gifts', 'Pastel-inspired gift sets', '#E9D8D2', 'sparkles'),
    ('Personalised gifts', 'personalised-gifts', 'Gifts with a personal touch', '#B7B3A5', 'pen-line'),
    ('Artificial flowers', 'artificial-flowers', 'Decorative floral gifts', '#B7B3A5', 'flower'),
    ('Gift hampers', 'gift-hampers', 'Curated gift hampers', '#F5EFE6', 'package'),
    ('Gift bouquets', 'gift-bouquets', 'Gift-ready bouquets', '#E9D8D2', 'flower'),
    ('Packaging accessories', 'packaging-accessories', 'Finishing touches for gifts', '#B9A2A0', 'ribbon'),
]

PRODUCT_DATA = [
    {
        'name': 'Blush Bloom Hamper',
        'slug': 'demo-blush-bloom-hamper',
        'category': 'Gift hampers',
        'price': '1599.00',
        'compare_price': '1799.00',
        'image': 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A blush-toned gift box with room for sweet treats and keepsakes.',
        'description': 'Demo catalog item. A curated gift box with pastel wrapping, a greeting card, and space for your chosen keepsakes.',
        'occasion': 'Birthday',
        'stock': 12,
        'tags': ['demo', 'birthday', 'hamper'],
        'featured': True,
    },
    {
        'name': 'Sweet Memory Bouquet',
        'slug': 'demo-sweet-memory-bouquet',
        'category': 'Gift bouquets',
        'price': '1299.00',
        'compare_price': '1499.00',
        'image': 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A floral-inspired bouquet for birthdays and anniversaries.',
        'description': 'Demo catalog item. A wrapped bouquet concept with a keepsake card and a soft, romantic palette.',
        'occasion': 'Anniversary',
        'stock': 9,
        'tags': ['demo', 'flowers', 'anniversary'],
        'featured': True,
    },
    {
        'name': 'K-Beauty Little Luxuries',
        'slug': 'demo-k-beauty-little-luxuries',
        'category': 'Korean aesthetic gifts',
        'price': '1199.00',
        'compare_price': '1399.00',
        'image': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A pastel self-care set with a clean, minimal look.',
        'description': 'Demo catalog item. A gift set concept for beauty accessories and self-care essentials.',
        'occasion': 'Friendship Day',
        'stock': 14,
        'tags': ['demo', 'beauty', 'korean aesthetic'],
        'featured': True,
    },
    {
        'name': 'Velvet Chocolate Treat Box',
        'slug': 'demo-velvet-chocolate-treat-box',
        'category': 'Chocolate gifts',
        'price': '799.00',
        'compare_price': '999.00',
        'image': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A sweet treat box for celebrations and thank-yous.',
        'description': 'Demo catalog item. A chocolate gift presentation with a message card and decorative wrap.',
        'occasion': 'Birthday',
        'stock': 18,
        'tags': ['demo', 'chocolate', 'birthday'],
        'featured': True,
    },
    {
        'name': 'Cloud Nine Plush Gift',
        'slug': 'demo-cloud-nine-plush-gift',
        'category': 'Plush toys',
        'price': '699.00',
        'compare_price': '899.00',
        'image': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A soft, cheerful gift to add to a custom hamper.',
        'description': 'Demo catalog item. A cuddly plush-gift concept, suited to birthdays and friendship gifts.',
        'occasion': 'Birthday',
        'stock': 10,
        'tags': ['demo', 'plush', 'birthday'],
        'featured': False,
    },
    {
        'name': 'Golden Glow Care Set',
        'slug': 'demo-golden-glow-care-set',
        'category': 'Beauty accessories',
        'price': '899.00',
        'compare_price': '1099.00',
        'image': 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A polished self-care set with warm neutral accents.',
        'description': 'Demo catalog item. A beauty-accessory gift set concept with a premium presentation.',
        'occasion': 'Thank You',
        'stock': 15,
        'tags': ['demo', 'beauty', 'self-care'],
        'featured': False,
    },
    {
        'name': 'A Little Note Card Set',
        'slug': 'demo-little-note-card-set',
        'category': 'Personalised gifts',
        'price': '299.00',
        'compare_price': '399.00',
        'image': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A personal note set for a thoughtful finishing touch.',
        'description': 'Demo catalog item. A stationery gift concept for custom messages and keepsakes.',
        'occasion': 'Any occasion',
        'stock': 30,
        'tags': ['demo', 'personalised', 'stationery'],
        'featured': False,
    },
    {
        'name': 'Rose Petal Keepsake',
        'slug': 'demo-rose-petal-keepsake',
        'category': 'Artificial flowers',
        'price': '499.00',
        'compare_price': '649.00',
        'image': 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A decorative floral keepsake for a desk or bedside table.',
        'description': 'Demo catalog item. A floral keepsake concept for birthdays, proposals, and anniversaries.',
        'occasion': 'Anniversary',
        'stock': 16,
        'tags': ['demo', 'flowers', 'keepsake'],
        'featured': False,
    },
    {
        'name': 'Mini Celebration Hamper',
        'slug': 'demo-mini-celebration-hamper',
        'category': 'Gift hampers',
        'price': '999.00',
        'compare_price': '1199.00',
        'image': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A compact celebration hamper with thoughtful finishing touches.',
        'description': 'Demo catalog item. A small hamper concept for celebrations, congratulations, and thank-yous.',
        'occasion': 'Graduation',
        'stock': 8,
        'tags': ['demo', 'hamper', 'celebration'],
        'featured': True,
    },
    {
        'name': 'Pastel Posy Wrap',
        'slug': 'demo-pastel-posy-wrap',
        'category': 'Gift bouquets',
        'price': '899.00',
        'compare_price': '1099.00',
        'image': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A soft pastel bouquet wrap for a small celebration.',
        'description': 'Demo catalog item. A pastel bouquet concept that can be paired with a message card.',
        'occasion': 'Thank You',
        'stock': 10,
        'tags': ['demo', 'bouquet', 'pastel'],
        'featured': False,
    },
    {
        'name': 'Ribbon & Keepsake Kit',
        'slug': 'demo-ribbon-keepsake-kit',
        'category': 'Packaging accessories',
        'price': '249.00',
        'compare_price': '349.00',
        'image': 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80',
        'short_description': 'Ribbons and gift tags to finish a hamper beautifully.',
        'description': 'Demo catalog item. A packaging-accessory set concept with ribbons, tags, and tissue wrap.',
        'occasion': 'Any occasion',
        'stock': 24,
        'tags': ['demo', 'packaging', 'ribbon'],
        'featured': False,
    },
    {
        'name': 'Cozy Treats Gift Box',
        'slug': 'demo-cozy-treats-gift-box',
        'category': 'Chocolate gifts',
        'price': '599.00',
        'compare_price': '749.00',
        'image': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
        'short_description': 'A cozy treat box for a little moment of celebration.',
        'description': 'Demo catalog item. A gift-box concept for chocolates, sweets, and a handwritten greeting.',
        'occasion': 'Friendship Day',
        'stock': 20,
        'tags': ['demo', 'chocolate', 'gift box'],
        'featured': False,
    },
]


class Command(BaseCommand):
    help = 'Create or update a clearly labeled demo shop catalog.'

    @transaction.atomic
    def handle(self, *args, **options):
        categories = {}
        for name, slug, description, accent, icon in CATEGORY_DATA:
            category, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'description': description,
                    'accent': accent,
                    'icon': icon,
                },
            )
            categories[name] = category

        for entry in PRODUCT_DATA:
            defaults = {
                'category': categories[entry['category']],
                'short_description': entry['short_description'],
                'description': entry['description'],
                'price': Decimal(entry['price']),
                'compare_price': Decimal(entry['compare_price']),
                'image': entry['image'],
                'gallery': [entry['image']],
                'tags': entry['tags'],
                'badge': 'DEMO',
                'occasion': entry['occasion'],
                'stock': entry['stock'],
                'is_featured': entry['featured'],
                'is_available': True,
                'rating': 0.0,
            }
            Product.objects.update_or_create(
                slug=entry['slug'],
                defaults={'name': entry['name'], **defaults},
            )

        self.stdout.write(self.style.SUCCESS(
            f'Catalog ready: {len(categories)} categories and {len(PRODUCT_DATA)} shop products.'
        ))
