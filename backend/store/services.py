import logging
import smtplib

from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from django.utils.html import escape

from .models import Order

logger = logging.getLogger(__name__)

PACKAGING_LABELS = {
    'standard': 'Standard packaging',
    'premium_box': 'Premium gift box',
    'luxury_basket': 'Luxury basket',
    'bouquet_wrap': 'Bouquet wrapping',
    'custom': 'Custom packaging',
}

PERSONALISATION_LABELS = (
    ('recipient', 'Recipient'),
    ('sender', 'Sender'),
    ('message', 'Gift message'),
    ('card_message', 'Card message'),
    ('preferred_colours', 'Preferred colours'),
    ('special_instructions', 'Special instructions'),
)


def _item_details(item):
    customization = item.customization or {}
    details = []
    for key, label in (
        ('occasion', 'Occasion'),
        ('hamper_type', 'Hamper type'),
        ('theme', 'Theme'),
        ('budget', 'Selected budget'),
    ):
        if customization.get(key):
            details.append((label, str(customization[key])))

    packaging = customization.get('packaging')
    if packaging:
        details.append(('Packaging', PACKAGING_LABELS.get(packaging, str(packaging))))

    selected_products = customization.get('products', [])
    if isinstance(selected_products, list) and selected_products:
        details.append((
            'Included items',
            ', '.join(
                f'{product.get("name", "Gift item")} × {product.get("quantity", 1)}'
                for product in selected_products
                if isinstance(product, dict)
            ),
        ))

    personalisation = customization.get('personalisation', {})
    if isinstance(personalisation, dict):
        for key, label in PERSONALISATION_LABELS:
            if personalisation.get(key):
                details.append((label, str(personalisation[key])))
    return details


def send_order_confirmation(order: Order, tracking_url: str = '') -> bool:
    items = list(order.items.all())
    item_entries = []
    for item in items:
        name = item.product_name_snapshot or 'Gift item'
        line_total = item.unit_price * item.quantity
        item_entries.append({
            'name': name,
            'quantity': item.quantity,
            'unit_price': item.unit_price,
            'line_total': line_total,
            'details': _item_details(item),
        })

    plain_items = []
    html_items = []
    for item in item_entries:
        plain_items.append(
            f'- {item["name"]} × {item["quantity"]} — '
            f'₹{item["unit_price"]:.2f} each; line total ₹{item["line_total"]:.2f}'
        )
        plain_items.extend(f'  {label}: {value}' for label, value in item['details'])
        html_details = ''.join(
            f'<li style="padding:3px 0;color:#514542;">'
            f'<strong>{escape(label)}:</strong> {escape(value)}</li>'
            for label, value in item['details']
        )
        html_details_list = (
            f'<ul style="margin:10px 0 0;padding-left:20px;font-size:13px;line-height:1.6;">'
            f'{html_details}</ul>'
            if html_details else ''
        )
        html_items.append(
            '<tr><td style="padding:16px 0;border-bottom:1px solid #E9D8D2;">'
            f'<div style="font-family:Georgia,serif;font-size:17px;color:#514542;">'
            f'{escape(item["name"])} <span style="font-family:Arial,sans-serif;font-size:13px;">'
            f'× {item["quantity"]}</span></div>'
            f'<div style="margin-top:5px;font-size:13px;color:#6b625e;">'
            f'₹{item["unit_price"]:.2f} each · Line total ₹{item["line_total"]:.2f}</div>'
            f'{html_details_list}</td></tr>'
        )

    created_at = timezone.localtime(order.created_at).strftime('%d %b %Y, %I:%M %p')
    plain_items_text = '\n'.join(plain_items)
    html_delivery_address = escape(order.delivery_address).replace('\n', '<br>')
    tracking_text = f'\nTrack your order: {tracking_url}\n' if tracking_url else ''
    tracking_html = (
        '<tr><td align="center" style="padding:0 32px 28px;">'
        '<a href="' + escape(tracking_url) + '" '
        'style="display:inline-block;padding:13px 24px;border-radius:999px;'
        'background:#514542;color:#ffffff;text-decoration:none;font-size:14px;'
        'font-weight:bold;">Track your order</a></td></tr>'
        if tracking_url else ''
    )
    subject = f'Your Belongings order #{order.pk} is in! ✨'
    body = (
        f'Hi {order.customer_name},\n\n'
        f'A little gifting magic is underway! We have received your order #{order.pk}.\n'
        'We will send you another note when its status changes.\n\n'
        f'ORDER DETAILS\n'
        f'Order date: {created_at}\n'
        f'Order status: {order.get_status_display()}\n'
        f'Payment status: {order.payment_status}\n\n'
        f'YOUR DETAILS\n'
        f'Name: {order.customer_name}\n'
        f'Email: {order.email}\n'
        f'Phone: {order.phone or "Not provided"}\n\n'
        f'DELIVERING TO\n{order.delivery_address}\n\n'
        f'YOUR ORDER\n{plain_items_text}\n\n'
        f'Subtotal: ₹{order.subtotal:.2f}\n'
        f'Delivery: ₹{order.shipping_charge:.2f}\n'
        f'Total: ₹{order.total:.2f}\n\n'
        f'{tracking_text}'
        'Thank you for choosing Belongings.\n'
        'With love,\nThe Belongings team'
    )
    html_body = (
        '<!doctype html><html><body style="margin:0;padding:0;background:#F5EFE6;'
        'font-family:Arial,Helvetica,sans-serif;color:#514542;">'
        '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">'
        'A little joy is on its way. Your Belongings order details are inside.</div>'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="background:#F5EFE6;"><tr><td align="center" style="padding:28px 12px;">'
        '<table role="presentation" width="620" cellspacing="0" cellpadding="0" '
        'style="width:100%;max-width:620px;background:#ffffff;border:1px solid #E9D8D2;'
        'border-radius:18px;overflow:hidden;">'
        '''<div style="text-align: center; margin: 15px 0;">
    <img
        src="frontend\public\Kawaii Bear Thank You Banner.png"
        alt="Flowers"
        width="90"
        style="display:block; margin:auto; border:0;"
    >
</div>'''
        '<tr><td align="center" style="padding:28px 24px;background:#E9D8D2;">'
        '<div style="font-family:Georgia,Times New Roman,serif;font-size:28px;'
        'letter-spacing:1px;color:#514542;">Melt &amp; Muse</div>'
        '<div style="margin-top:7px;font-size:11px;letter-spacing:2px;text-transform:uppercase;'
        'color:#514542;">Thoughtful gifting, beautifully wrapped</div></td></tr>'
        '<tr><td style="padding:30px 32px 18px;">'
        '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b7474;">'
        'A little joy is on its way</div>'
        f'<h1 style="margin:10px 0 8px;font-family:Georgia,Times New Roman,serif;'
        f'font-size:30px;font-weight:normal;color:#514542;">Thank you, {escape(order.customer_name)}!</h1>'
        f'<p style="margin:0;color:#6b625e;line-height:1.6;">We have received order '
        f'<strong>#{order.pk}</strong>. We will send you another note when its status changes.</p>'
        '</td></tr>'
        '<tr><td style="padding:0 32px 24px;">'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="background:#F5EFE6;border-radius:12px;"><tr>'
        '<td style="padding:16px;font-size:13px;line-height:1.8;">'
        f'<strong>Order date</strong><br>{escape(created_at)}<br>'
        f'<strong>Order status</strong><br>{escape(order.get_status_display())}<br>'
        f'<strong>Payment status</strong><br>{escape(order.payment_status)}'
        '</td></tr></table></td></tr>'
        '<tr><td style="padding:0 32px 24px;">'
        '<h2 style="margin:0 0 6px;font-family:Georgia,Times New Roman,serif;'
        'font-size:22px;font-weight:normal;">Your order</h2>'
        '<p style="margin:0 0 8px;font-size:13px;color:#7a706b;">A little something, chosen just for you.</p>'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
        f'{"".join(html_items)}</table></td></tr>'
        '<tr><td style="padding:0 32px 24px;">'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="background:#F5EFE6;border-radius:12px;"><tr><td style="padding:18px;">'
        f'<div style="font-size:13px;line-height:2;">Subtotal <span style="float:right;">₹{order.subtotal:.2f}</span></div>'
        f'<div style="font-size:13px;line-height:2;">Delivery <span style="float:right;">₹{order.shipping_charge:.2f}</span></div>'
        '<div style="height:1px;margin:8px 0;background:#B9A2A0;"></div>'
        f'<div style="font-size:16px;font-weight:bold;">Total <span style="float:right;">₹{order.total:.2f}</span></div>'
        '</td></tr></table></td></tr>'
        '<tr><td style="padding:0 32px 24px;">'
        '<h2 style="margin:0 0 12px;font-family:Georgia,Times New Roman,serif;'
        'font-size:22px;font-weight:normal;">Delivering to</h2>'
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" '
        'style="border-left:3px solid #B7B3A5;"><tr><td style="padding:4px 14px;'
        'font-size:13px;line-height:1.8;">'
        f'<strong>{escape(order.customer_name)}</strong><br>'
        f'{escape(order.email)}<br>{escape(order.phone or "Phone not provided")}<br>'
        f'{html_delivery_address}</td></tr></table></td></tr>'
        f'{tracking_html}'
        '<tr><td align="center" style="padding:22px 24px;background:#514542;color:#F5EFE6;">'
        '<div style="font-family:Georgia,Times New Roman,serif;font-size:18px;">'
        'Thank you for choosing Melt &amp; Muse</div>'
        '<div style="margin-top:6px;font-size:12px;color:#E9D8D2;">With love, The Melt &amp; Muse team</div>'
        '</td></tr></table></td></tr></table></body></html>'
    )
    message = EmailMultiAlternatives(
        subject=subject,
        body=body,
        to=[order.email],
    )
    message.attach_alternative(html_body, 'text/html')

    try:
        sent_count = message.send(fail_silently=False)
        if sent_count != 1:
            logger.error(
                'Email backend returned %s messages for order confirmation %s.',
                sent_count,
                order.pk,
            )
        return sent_count == 1
    except (smtplib.SMTPException, OSError):
        logger.exception('Could not send order confirmation for order %s.', order.pk)
        return False
