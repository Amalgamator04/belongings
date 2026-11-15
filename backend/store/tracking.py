from django.core import signing

TRACKING_TOKEN_SALT = 'store.order-tracking'
TRACKING_TOKEN_MAX_AGE = 180 * 24 * 60 * 60


def issue_tracking_token(order_id):
    return signing.dumps({'order_id': order_id}, salt=TRACKING_TOKEN_SALT, compress=True)


def read_tracking_order_id(token):
    payload = signing.loads(
        token,
        salt=TRACKING_TOKEN_SALT,
        max_age=TRACKING_TOKEN_MAX_AGE,
    )
    order_id = payload.get('order_id') if isinstance(payload, dict) else None
    if not isinstance(order_id, int) or isinstance(order_id, bool) or order_id < 1:
        raise signing.BadSignature('Invalid order tracking token.')
    return order_id
