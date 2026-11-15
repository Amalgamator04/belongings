import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  ArrowRight,
  BarChart3,
  Check,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { categories, hamperOptions } from './content'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace(/\/+$/, '')

function getStoredCart() {
  try {
    const stored = JSON.parse(window.localStorage.getItem('melt-and-muse-cart') || '[]')
    return Array.isArray(stored) ? stored : []
  } catch (error) {
    console.error('Unable to restore the saved cart.', error)
    window.localStorage.removeItem('melt-and-muse-cart')
    return []
  }
}

function getStoredAuth() {
  try {
    const stored = JSON.parse(window.localStorage.getItem('melt-and-muse-auth') || 'null')
    return stored?.access && stored?.refresh ? stored : null
  } catch (error) {
    console.error('Unable to restore the saved login session.', error)
    window.localStorage.removeItem('melt-and-muse-auth')
    return null
  }
}

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

function getDefaultAdminFilters() {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - 29)
  const toDateValue = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return {
    start_date: toDateValue(startDate),
    end_date: toDateValue(endDate),
    status: '',
    search: '',
  }
}

function App() {
  const [cart, setCart] = useState(getStoredCart)
  const [auth, setAuth] = useState(getStoredAuth)
  const [shopProducts, setShopProducts] = useState([])
  const [builderItems, setBuilderItems] = useState([])
  const [builderItemsLoading, setBuilderItemsLoading] = useState(true)
  const [builderItemsError, setBuilderItemsError] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [authNotice, setAuthNotice] = useState('')

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/products/`)
      .then((response) => {
        const catalog = Array.isArray(response.data) ? response.data : response.data.results
        setShopProducts(catalog.map((product) => ({
          ...product,
          category: product.category_name,
          comparePrice: Number(product.compare_price),
          shortDescription: product.short_description,
          price: Number(product.price),
          gallery: product.gallery?.length ? product.gallery : [product.image],
        })))
      })
      .catch((error) => {
        console.error('Unable to load the product catalog.', error)
        setCatalogError('We could not load the catalog. Please check that the store API is running and try again.')
      })
      .finally(() => setCatalogLoading(false))

    axios
      .get(`${API_BASE_URL}/api/builder-items/`)
      .then((response) => {
        setBuilderItems(response.data.map((item) => ({
          ...item,
          category: item.category_name,
          shortDescription: item.short_description,
          price: null,
          is_builder_only: true,
          gallery: item.gallery?.length ? item.gallery : [item.image],
        })))
      })
      .catch((error) => {
        console.error('Unable to load custom hamper selections.', error)
        setBuilderItemsError('We could not load the hamper selections. Please try again later.')
      })
      .finally(() => setBuilderItemsLoading(false))
  }, [])

  useEffect(() => {
    window.localStorage.setItem('melt-and-muse-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (auth) {
      window.localStorage.setItem('melt-and-muse-auth', JSON.stringify(auth))
    } else {
      window.localStorage.removeItem('melt-and-muse-auth')
    }
  }, [auth])

  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout/`, { refresh: auth.refresh })
      setAuthNotice('')
    } catch (error) {
      console.error('Unable to revoke the refresh token on the server.', error)
      setAuthNotice('Signed out on this device. The server could not revoke the refresh token.')
    } finally {
      setAuth(null)
    }
  }

  const addToCart = (product, quantity = 1) => {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id)
      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      }

      return [...currentCart, { ...product, quantity }]
    })
  }

  const updateCartQty = (productId, delta) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const removeFromCart = (productId) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId))
  }

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F5EFE6] text-[#514542]">
        <Header cartCount={cartCount} auth={auth} onLogout={logout} />

        <main>
          {catalogError && (
            <div role="alert" className="section-shell mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {catalogError}
            </div>
          )}
          {authNotice && (
            <div role="status" className="section-shell mt-3 rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-4 py-3 text-sm">
              {authNotice}
            </div>
          )}
          <Routes>
            <Route
              path="/"
              element={<HomePage products={shopProducts} addToCart={addToCart} catalogLoading={catalogLoading} />}
            />
            <Route
              path="/shop"
              element={<ShopPage products={shopProducts} addToCart={addToCart} catalogLoading={catalogLoading} />}
            />
            <Route
              path="/product/:id"
              element={<ProductPage products={shopProducts} addToCart={addToCart} />}
            />
            <Route
              path="/builder"
              element={
                <BuilderPage
                  products={shopProducts}
                  builderItems={builderItems}
                  builderItemsLoading={builderItemsLoading}
                  builderItemsError={builderItemsError}
                  addToCart={addToCart}
                />
              }
            />
            <Route
              path="/cart"
              element={
                <CartPage
                  cart={cart}
                  removeFromCart={removeFromCart}
                  updateCartQty={updateCartQty}
                  subtotal={cartSubtotal}
                />
              }
            />
            <Route
              path="/checkout"
              element={
                <CheckoutPage
                  cart={cart}
                  subtotal={cartSubtotal}
                  auth={auth}
                  removeFromCart={removeFromCart}
                  updateCartQty={updateCartQty}
                  onOrderPlaced={() => setCart([])}
                />
              }
            />
            <Route
              path="/login"
              element={<AuthPage mode="login" onAuthenticated={setAuth} />}
            />
            <Route
              path="/register"
              element={<AuthPage mode="register" onAuthenticated={setAuth} />}
            />
            <Route
              path="/account"
              element={
                auth
                  ? <AccountPage auth={auth} />
                  : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/admin"
              element={
                auth?.user?.is_staff
                  ? <AdminDashboard auth={auth} />
                  : <Navigate to={auth ? '/account' : '/login'} replace />
              }
            />
            <Route
              path="/admin/products"
              element={
                auth?.user?.is_staff
                  ? <AdminProductManager auth={auth} />
                  : <Navigate to={auth ? '/account' : '/login'} replace />
              }
            />
            <Route path="/track-order" element={<OrderTrackingPage auth={auth} />} />
            <Route path="/support" element={<SupportPage />} />
          </Routes>
        </main>

        <Footer auth={auth} />
      </div>
    </BrowserRouter>
  )
}

function Header({ cartCount, auth, onLogout }) {
  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'Hamper Builder', to: '/builder' },
    { label: 'Cart', to: '/cart' },
    { label: 'Account', to: auth ? '/account' : '/login' },
    ...(auth?.user?.is_staff ? [{ label: 'Admin', to: '/admin' }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-[#f5dfe7] bg-[#fffaf7]/90 backdrop-blur-xl">
      <div className="section-shell flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/sticker.png"
            alt="Belongings"
            className="h-12 w-32 rounded-2xl border border-[#E9D8D2] object-cover object-center shadow-sm md:h-14 md:w-36"
          />
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#8a6b73]">
              Boutique gifting
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive ? 'text-[#7f3d52]' : 'text-[#60525a] hover:text-[#7f3d52]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {auth?.user?.is_staff && (
            <Link to="/admin" className="rounded-full bg-[#514542] px-3 py-2 text-xs font-medium text-white md:hidden">
              Admin
            </Link>
          )}
          {auth ? (
            <button
              type="button"
              onClick={onLogout}
              className="hidden rounded-full border border-[#E9D8D2] bg-white px-4 py-2.5 text-sm font-medium text-[#514542] md:inline-flex"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-full border border-[#E9D8D2] bg-white px-4 py-2.5 text-sm font-medium text-[#514542] md:inline-flex"
            >
              Sign in
            </Link>
          )}
          <Link
            to="/shop"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-[#f3dbe2] bg-white text-[#4f3941] shadow-sm md:flex"
            aria-label="Search products"
          >
            <Search size={18} />
          </Link>
          <Link
            to="/cart"
            className="flex items-center gap-2 rounded-full bg-[#2f1f25] px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-[#4b2d3c]"
          >
            <ShoppingBag size={17} />
            <span>Cart</span>
            <span className="rounded-full bg-[#f9dfe8] px-2 py-0.5 text-xs font-bold text-[#582b3a]">
              {cartCount}
            </span>
          </Link>
        </div>
      </div>
      <nav className="section-shell flex gap-6 overflow-x-auto pb-3 text-sm md:hidden">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="whitespace-nowrap text-[#514542]">
            {item.label}
          </NavLink>
        ))}
        {auth && (
          <button type="button" onClick={onLogout} className="whitespace-nowrap text-[#514542]">
            Sign out
          </button>
        )}
      </nav>
    </header>
  )
}

function AuthPage({ mode, onAuthenticated }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const [values, setValues] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)
    try {
      const endpoint = isRegister ? 'register' : 'login'
      const response = await axios.post(`${API_BASE_URL}/api/auth/${endpoint}/`, values)
      const session = {
        access: response.data.access,
        refresh: response.data.refresh,
        user: response.data.user,
      }

      if (!session.user) {
        const profileResponse = await axios.get(`${API_BASE_URL}/api/profile/`, {
          headers: { Authorization: `Bearer ${session.access}` },
        })
        session.user = profileResponse.data
      }

      onAuthenticated(session)
      navigate('/account')
    } catch (error) {
      console.error(`Unable to ${isRegister ? 'register' : 'sign in'}.`, error)
      const responseData = error.response?.data
      const message = responseData
        ? Object.values(responseData).flat(Infinity).find((value) => typeof value === 'string')
        : null
      setErrorMessage(message || 'We could not complete your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="section-shell py-16">
      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-5 rounded-[30px] border border-[#E9D8D2] bg-white p-8 shadow-sm">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#514542]">Belongings account</div>
          <h1 className="mt-2 text-4xl font-semibold">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm text-[#514542]">
            {isRegister ? 'Save addresses and keep your orders together.' : 'Sign in to view your account and orders.'}
          </p>
        </div>
        {isRegister && (
          <>
            <label className="block text-sm font-medium">
              First name
              <input
                autoComplete="given-name"
                required
                value={values.first_name}
                onChange={(event) => setValues({ ...values, first_name: event.target.value })}
                className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-4 py-3"
              />
            </label>
            <label className="block text-sm font-medium">
              Last name
              <input
                autoComplete="family-name"
                value={values.last_name}
                onChange={(event) => setValues({ ...values, last_name: event.target.value })}
                className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-4 py-3"
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={values.email}
                onChange={(event) => setValues({ ...values, email: event.target.value })}
                className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-4 py-3"
              />
            </label>
          </>
        )}
        <label className="block text-sm font-medium">
          Username
          <input
            autoComplete="username"
            required
            value={values.username}
            onChange={(event) => setValues({ ...values, username: event.target.value })}
            className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-4 py-3"
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={isRegister ? 8 : undefined}
            value={values.password}
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-4 py-3"
          />
        </label>
        {errorMessage && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{errorMessage}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[#514542] px-5 py-3 font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
        <p className="text-center text-sm">
          {isRegister ? 'Already have an account?' : 'New to Belongings?'}{' '}
          <Link to={isRegister ? '/login' : '/register'} className="font-semibold underline">
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </form>
    </div>
  )
}

function AccountPage({ auth }) {
  const [orders, setOrders] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/orders/`, {
        headers: { Authorization: `Bearer ${auth.access}` },
      })
      .then((response) => {
        setOrders(Array.isArray(response.data) ? response.data : response.data.results)
      })
      .catch((error) => {
        console.error('Unable to load account orders.', error)
        setLoadError('We could not load your orders. Please sign in again and retry.')
      })
  }, [auth.access])

  return (
    <div className="section-shell py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[#514542]">Your account</div>
        <h1 className="mt-2 text-4xl font-semibold">
          Hello{auth.user?.first_name ? `, ${auth.user.first_name}` : ''}
        </h1>
        <p className="mt-2">{auth.user?.email}</p>
      </div>
      <section className="rounded-[28px] border border-[#E9D8D2] bg-white p-6">
        <h2 className="text-2xl font-semibold">My orders</h2>
        {loadError && <p role="alert" className="mt-4 text-sm text-red-800">{loadError}</p>}
        {!loadError && orders.length === 0 && (
          <p className="mt-4 text-sm">No orders are linked to this account yet.</p>
        )}
        <div className="mt-5 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F5EFE6] p-4">
              <div>
                <div className="font-semibold">Order #{order.id}</div>
                <div className="text-sm">{new Date(order.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <div className="text-sm">{order.status_label || order.status.replaceAll('_', ' ')}</div>
              <div className="font-semibold">{formatMoney(Number(order.total))}</div>
              <Link
                to={`/track-order?order=${order.id}`}
                className="text-sm font-semibold text-[#7f3d52] underline"
              >
                Track order
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function OrderTrackingPage({ auth }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const orderId = searchParams.get('order') || ''
  const requestKey = token
    ? `token:${token}`
    : orderId && auth?.access
      ? `order:${orderId}:${auth.access}`
      : ''
  const [trackingState, setTrackingState] = useState({
    key: '',
    order: null,
    error: '',
  })
  const hasCurrentState = Boolean(requestKey) && trackingState.key === requestKey
  const order = hasCurrentState ? trackingState.order : null
  const error = hasCurrentState ? trackingState.error : ''
  const loading = Boolean(requestKey) && !hasCurrentState

  useEffect(() => {
    if (!requestKey) return undefined
    let active = true
    const request = token
      ? axios.get(`${API_BASE_URL}/api/orders/track/`, { params: { token } })
      : axios.get(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/`, {
        headers: { Authorization: `Bearer ${auth.access}` },
      })
    request
      .then((response) => {
        if (active) setTrackingState({ key: requestKey, order: response.data, error: '' })
      })
      .catch((requestError) => {
        if (!active) return
        console.error('Unable to load order tracking details.', requestError)
        const message = requestError.response?.status === 404
            ? 'This tracking link is invalid or has expired.'
            : requestError.response?.status === 401
              ? 'Please sign in again to track this order.'
              : 'We could not load this order right now. Please try again.'
        setTrackingState({ key: requestKey, order: null, error: message })
      })

    return () => {
      active = false
    }
  }, [auth?.access, orderId, requestKey, token])

  const progressSteps = [
    { value: 'pending', label: 'Pending' },
    { value: 'taken', label: 'Taken' },
    { value: 'delivered', label: 'Delivered' },
  ]
  const currentStep = progressSteps.findIndex((step) => step.value === order?.tracking_status)

  return (
    <div className="section-shell py-12">
      <header className="rounded-[28px] border border-[#E9D8D2] bg-white p-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Order updates</div>
        <h1 className="mt-2 text-4xl font-semibold text-[#2d1b21]">Track your order</h1>
        <p className="mt-3 text-[#645761]">See the latest update on your gifting moment.</p>
      </header>

      {loading && <p role="status" className="mt-6 rounded-xl bg-white p-5">Loading tracking details…</p>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-5 text-sm text-red-800">{error}</p>}

      {!loading && !error && !order && (
        <section className="mt-6 rounded-[28px] border border-[#E9D8D2] bg-white p-8">
          <h2 className="text-2xl font-semibold">Find your order</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#645761]">
            Guest orders have a private tracking link in the confirmation email and on the order confirmation screen.
            If you have an account, sign in and open My orders to track an order.
          </p>
          <Link
            to={auth ? '/account' : '/login'}
            className="mt-5 inline-flex rounded-full bg-[#514542] px-5 py-3 text-sm font-medium text-white"
          >
            {auth ? 'Open My orders' : 'Sign in'}
          </Link>
        </section>
      )}

      {order && (
        <div className="mt-6 space-y-6">
          <section className="rounded-[28px] border border-[#E9D8D2] bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f3d52]">Order #{order.id}</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#2d1b21]">{order.status_label}</h2>
                <p className="mt-1 text-sm text-[#645761]">
                  Placed {new Date(order.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F5EFE6] px-5 py-3">
                <div className="text-xs uppercase tracking-wide text-[#645761]">Order total</div>
                <div className="mt-1 text-xl font-semibold">{formatMoney(Number(order.total))}</div>
              </div>
            </div>

            {order.is_cancelled ? (
              <p className="mt-6 rounded-xl bg-[#F5EFE6] p-4 text-sm">
                This order has been cancelled. Please contact support if you need help.
              </p>
            ) : (
              <ol aria-label="Order progress" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {progressSteps.map((step, index) => {
                  const isComplete = currentStep >= 0 && index <= currentStep
                  return (
                    <li key={step.value} className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        isComplete ? 'bg-[#514542] text-white' : 'bg-[#F5EFE6] text-[#736966]'
                      }`}>
                        {isComplete ? <Check size={16} /> : index + 1}
                      </span>
                      <span className={`text-sm ${index === currentStep ? 'font-semibold text-[#514542]' : 'text-[#645761]'}`}>
                        {step.label}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
            <p className="mt-6 text-sm text-[#645761]">Payment status: <strong>{order.payment_status}</strong></p>
          </section>

          <section className="rounded-[28px] border border-[#E9D8D2] bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">Items in this order</h2>
            <ul className="mt-4 divide-y divide-[#E9D8D2]">
              {order.items.map((item, index) => (
                <li key={`${item.product_name_snapshot}-${index}`} className="flex justify-between gap-4 py-3 text-sm">
                  <span>{item.product_name_snapshot}</span>
                  <span className="shrink-0 text-[#645761]">× {item.quantity}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}

function AdminDashboard({ auth }) {
  const [draftFilters, setDraftFilters] = useState(getDefaultAdminFilters)
  const [filters, setFilters] = useState(getDefaultAdminFilters)
  const [page, setPage] = useState(1)
  const [dashboardState, setDashboardState] = useState({
    key: '',
    dashboard: null,
    orderPage: null,
    error: '',
  })
  const [actionError, setActionError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const requestKey = JSON.stringify([auth.user?.id, filters, page, reloadKey])
  const hasCurrentState = dashboardState.key === requestKey
  const dashboard = hasCurrentState ? dashboardState.dashboard : null
  const orderPage = hasCurrentState ? dashboardState.orderPage : null
  const error = actionError || (hasCurrentState ? dashboardState.error : '')
  const loading = !hasCurrentState

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page) })
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const headers = { Authorization: `Bearer ${auth.access}` }

    Promise.all([
      axios.get(`${API_BASE_URL}/api/admin/dashboard/`, { params, headers }),
      axios.get(`${API_BASE_URL}/api/admin/orders/`, { params, headers }),
    ])
      .then(([dashboardResponse, ordersResponse]) => {
        if (!active) return
        setDashboardState({
          key: requestKey,
          dashboard: dashboardResponse.data,
          orderPage: ordersResponse.data,
          error: '',
        })
      })
      .catch((requestError) => {
        if (!active) return
        console.error('Unable to load the admin order dashboard.', requestError)
        const message = requestError.response?.status === 401
            ? 'Your session may have expired. Sign in again to view admin orders.'
            : requestError.response?.status === 403
              ? 'This account does not have permission to view admin orders.'
              : 'We could not load the order dashboard. Please try again.'
        setDashboardState({
          key: requestKey,
          dashboard: null,
          orderPage: null,
          error: message,
        })
      })

    return () => {
      active = false
    }
  }, [auth.access, filters, page, reloadKey, requestKey])

  const applyFilters = (event) => {
    event.preventDefault()
    setPage(1)
    setFilters({ ...draftFilters })
  }

  const resetFilters = () => {
    const defaults = getDefaultAdminFilters()
    setDraftFilters(defaults)
    setFilters({ ...defaults })
    setPage(1)
  }

  const updateOrderStatus = async (orderId, status) => {
    setActionError('')
    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/orders/${orderId}/status/`,
        { status },
        { headers: { Authorization: `Bearer ${auth.access}` } },
      )
      setReloadKey((key) => key + 1)
    } catch (requestError) {
      console.error('Unable to update order status.', requestError)
      setActionError(requestError.response?.data?.status?.[0] || 'We could not update this order status.')
    }
  }

  const statuses = dashboard?.status_choices || []
  const dailyTotals = dashboard?.daily_order_totals || []
  const maxDailyOrders = Math.max(1, ...dailyTotals.map((day) => day.orders))
  const maxStatusCount = Math.max(1, ...statuses.map((status) => status.count))
  const totalPages = Math.max(1, Math.ceil((orderPage?.count || 0) / 20))
  const metricCards = [
    { label: 'Orders', value: dashboard?.total_orders ?? '—', Icon: ClipboardList },
    { label: 'Awaiting progress', value: dashboard?.pending_orders ?? '—', Icon: Clock3 },
    { label: 'Delivered', value: dashboard?.completed_orders ?? '—', Icon: Check },
    { label: 'Order value', value: dashboard ? formatMoney(Number(dashboard.total_order_value)) : '—', Icon: CircleDollarSign },
  ]

  return (
    <div className="section-shell space-y-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Staff workspace</div>
          <h1 className="mt-2 text-4xl font-semibold text-[#2d1b21]">Order dashboard</h1>
          <p className="mt-2 text-sm text-[#645761]">Review orders, monitor progress, and update fulfillment status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin/products" className="rounded-full bg-[#514542] px-4 py-2.5 text-sm font-medium text-white">
            Manage products
          </Link>
          <div className="rounded-full bg-white px-4 py-2 text-sm text-[#645761]">
            Signed in as {auth.user?.email}
          </div>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <form onSubmit={applyFilters} className="grid gap-4 rounded-[24px] border border-[#E9D8D2] bg-white p-5 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-medium">
          Search orders
          <input
            value={draftFilters.search}
            onChange={(event) => setDraftFilters({ ...draftFilters, search: event.target.value })}
            placeholder="Order #, name, email, phone"
            className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-3 py-2.5 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            value={draftFilters.status}
            onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })}
            className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-3 py-2.5 font-normal"
          >
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          From
          <input
            type="date"
            value={draftFilters.start_date}
            onChange={(event) => setDraftFilters({ ...draftFilters, start_date: event.target.value })}
            className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-3 py-2.5 font-normal"
          />
        </label>
        <label className="text-sm font-medium">
          To
          <input
            type="date"
            value={draftFilters.end_date}
            onChange={(event) => setDraftFilters({ ...draftFilters, end_date: event.target.value })}
            className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-3 py-2.5 font-normal"
          />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="flex-1 rounded-full bg-[#514542] px-4 py-2.5 text-sm font-medium text-white">
            Apply filters
          </button>
          <button type="button" onClick={resetFilters} className="rounded-full border border-[#E9D8D2] px-4 py-2.5 text-sm font-medium">
            Reset
          </button>
        </div>
      </form>

      <section aria-label="Order metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, Icon }) => (
          <article key={label} className="rounded-[24px] border border-[#E9D8D2] bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#645761]">{label}</span>
              <Icon size={20} className="text-[#7f3d52]" />
            </div>
            <div className="mt-3 text-2xl font-semibold text-[#2d1b21]">{value}</div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-[24px] border border-[#E9D8D2] bg-white p-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={19} className="text-[#7f3d52]" />
            <h2 className="text-lg font-semibold">Orders by day</h2>
          </div>
          <p className="mt-1 text-sm text-[#645761]">Daily order count for the selected filters.</p>
          {dailyTotals.length === 0 ? (
            <p className="mt-8 text-sm text-[#645761]">No orders in this date range.</p>
          ) : (
            <div className="mt-6 flex h-48 items-end gap-1 overflow-x-auto border-b border-[#E9D8D2] pb-2" role="img" aria-label="Bar chart of orders per day">
              {dailyTotals.map((day) => (
                <div key={day.date} className="flex h-full min-w-5 flex-1 flex-col items-center justify-end gap-2" title={`${day.date}: ${day.orders} orders, ${formatMoney(Number(day.order_value))} order value`}>
                  <span className="text-[10px] text-[#645761]">{day.orders || ''}</span>
                  <div
                    className="w-full rounded-t-md bg-[#B9A2A0]"
                    style={{ height: `${Math.max(4, (day.orders / maxDailyOrders) * 100)}%` }}
                  />
                  <span className="text-[9px] text-[#645761]">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-[24px] border border-[#E9D8D2] bg-white p-5">
          <div className="flex items-center gap-2">
            <PackageCheck size={19} className="text-[#7f3d52]" />
            <h2 className="text-lg font-semibold">Orders by status</h2>
          </div>
          <div className="mt-5 space-y-4">
            {statuses.map((status) => (
              <div key={status.value}>
                <div className="mb-1 flex justify-between gap-4 text-sm">
                  <span>{status.label}</span>
                  <span className="font-semibold">{status.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F5EFE6]">
                  <div className="h-full rounded-full bg-[#B7B3A5]" style={{ width: `${(status.count / maxStatusCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-[#E9D8D2] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9D8D2] p-5">
          <div>
            <h2 className="text-xl font-semibold">Orders</h2>
            <p className="mt-1 text-sm text-[#645761]">{orderPage?.count || 0} matching orders</p>
          </div>
          {loading && <span role="status" className="text-sm text-[#645761]">Updating…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#F5EFE6] text-[#514542]">
              <tr>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Items</th>
                <th className="px-5 py-3 font-semibold">Total</th>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E1]">
              {(orderPage?.results || []).map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4 align-top">
                    <div className="font-semibold">#{order.id}</div>
                    <div className="mt-1 text-xs text-[#645761]">{new Date(order.created_at).toLocaleDateString('en-IN')}</div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="font-medium">{order.customer_name}</div>
                    <div className="mt-1 text-xs text-[#645761]">{order.email}</div>
                    {order.phone && <div className="text-xs text-[#645761]">{order.phone}</div>}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li key={item.id}>{item.product_name_snapshot} × {item.quantity}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-4 align-top font-semibold">{formatMoney(Number(order.total))}</td>
                  <td className="px-5 py-4 align-top capitalize">{order.payment_status}</td>
                  <td className="px-5 py-4 align-top">
                    <select
                      aria-label={`Status for order ${order.id}`}
                      value={order.status}
                      onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                      className="max-w-48 rounded-lg border border-[#E9D8D2] bg-white px-2 py-2"
                    >
                      {statuses.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!loading && (orderPage?.results || []).length === 0 && (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-[#645761]">No orders match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#E9D8D2] p-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-full border border-[#E9D8D2] px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-[#645761]">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-full border border-[#E9D8D2] px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  )
}

function AdminProductManager({ auth }) {
  const [categoriesState, setCategoriesState] = useState({
    categories: [],
    error: '',
    loading: true,
  })
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [builderFilter, setBuilderFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [productsState, setProductsState] = useState({
    key: '',
    products: [],
    count: 0,
    error: '',
  })
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryFormError, setCategoryFormError] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [csvImport, setCsvImport] = useState({ busy: false, message: '', errors: [] })
  const [saving, setSaving] = useState(false)
  const categoryCsvInput = useRef(null)
  const productCsvInput = useRef(null)
  const requestKey = JSON.stringify([search, categoryFilter, builderFilter, page, reloadKey])
  const hasCurrentProducts = productsState.key === requestKey
  const products = hasCurrentProducts ? productsState.products : []
  const count = hasCurrentProducts ? productsState.count : 0
  const loading = !hasCurrentProducts
  const categories = categoriesState.categories
  const error = categoriesState.error || (hasCurrentProducts ? productsState.error : '')
  const totalPages = Math.max(1, Math.ceil(count / 20))
  const headers = { Authorization: `Bearer ${auth.access}` }

  useEffect(() => {
    let active = true
    axios.get(`${API_BASE_URL}/api/admin/categories/`, {
      headers: { Authorization: `Bearer ${auth.access}` },
    })
      .then((response) => {
        if (active) setCategoriesState({
          categories: response.data,
          error: '',
          loading: false,
        })
      })
      .catch((requestError) => {
        if (!active) return
        console.error('Unable to load catalog categories.', requestError)
        setCategoriesState({
          categories: [],
          error: requestError.response?.status === 403
            ? 'This account does not have permission to manage products.'
            : 'We could not load product categories. Please try again.',
          loading: false,
        })
      })
    return () => { active = false }
  }, [auth.access, reloadKey])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page) })
    const requestHeaders = { Authorization: `Bearer ${auth.access}` }
    if (search.trim()) params.set('search', search.trim())
    if (categoryFilter) params.set('category', categoryFilter)
    if (builderFilter !== 'all') params.set('builder_only', builderFilter)
    axios.get(`${API_BASE_URL}/api/admin/products/`, { params, headers: requestHeaders })
      .then((response) => {
        if (!active) return
        setProductsState({
          key: requestKey,
          products: response.data.results,
          count: response.data.count,
          error: '',
        })
      })
      .catch((requestError) => {
        if (!active) return
        console.error('Unable to load the product catalog.', requestError)
        setProductsState({
          key: requestKey,
          products: [],
          count: 0,
          error: requestError.response?.status === 403
            ? 'This account does not have permission to manage products.'
            : 'We could not load the product catalog. Please try again.',
        })
      })
    return () => { active = false }
  }, [auth.access, builderFilter, categoryFilter, page, requestKey, search])

  const startCreate = () => {
    setForm({
      id: null,
      name: '',
      slug: '',
      category: String(categories[0]?.id || ''),
      short_description: '',
      description: '',
      price: '',
      compare_price: '',
      image: '',
      gallery: '',
      tags: '',
      badge: '',
      occasion: '',
      stock: '0',
      is_featured: false,
      is_available: true,
      is_builder_only: false,
      rating: '0',
    })
    setFormError('')
  }

  const startEdit = (product) => {
    setForm({
      ...product,
      category: String(product.category),
      price: product.price ?? '',
      compare_price: product.compare_price ?? '',
      stock: String(product.stock ?? 0),
      rating: String(product.rating ?? 0),
      gallery: Array.isArray(product.gallery) ? product.gallery.join('\n') : '',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
    })
    setFormError('')
  }

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const saveCategory = async (event) => {
    event.preventDefault()
    setCategorySaving(true)
    setCategoryFormError('')
    const name = categoryName.trim()
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/categories/`,
        { name, slug },
        { headers },
      )
      setCategoriesState((current) => ({
        ...current,
        categories: [...current.categories, response.data].sort((a, b) => a.name.localeCompare(b.name)),
        error: '',
      }))
      setCategoryFormOpen(false)
      setCategoryName('')
    } catch (requestError) {
      console.error('Unable to create a catalog category.', requestError)
      const responseData = requestError.response?.data
      const firstFieldError = responseData && typeof responseData === 'object'
        ? Object.values(responseData).flat().find((value) => typeof value === 'string')
        : null
      setCategoryFormError(firstFieldError || 'We could not create this category. Please try again.')
    } finally {
      setCategorySaving(false)
    }
  }

  const downloadCsvTemplate = (type) => {
    const templates = {
      categories: {
        filename: 'category-import-template.csv',
        rows: [
          ['name', 'slug', 'description', 'accent', 'icon'],
          ['Gift hampers', 'gift-hampers', 'Curated gift hampers', '#E9D8D2', 'gift'],
        ],
      },
      products: {
        filename: 'product-import-template.csv',
        rows: [
          [
            'name', 'slug', 'category_slug', 'short_description', 'description', 'price',
            'compare_price', 'image', 'gallery', 'tags', 'badge', 'occasion', 'stock',
            'is_featured', 'is_available', 'is_builder_only', 'rating',
          ],
          [
            'Rose Gift Box', 'rose-gift-box', 'gift-hampers', 'A curated gift box', '',
            '1250', '1500', 'https://example.com/rose-box.jpg', '', 'rose|birthday',
            'Gift idea', 'Birthday', '10', 'true', 'true', 'false', '4.8',
          ],
        ],
      },
    }
    const template = templates[type]
    const csv = template.rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = template.filename
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const importCsv = async (type, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setCsvImport({ busy: true, message: '', errors: [] })
    const upload = new FormData()
    upload.append('file', file)
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/${type}/import/`,
        upload,
        { headers },
      )
      setCsvImport({
        busy: false,
        message: `Imported ${response.data.created} ${type}.`,
        errors: [],
      })
      setReloadKey((key) => key + 1)
    } catch (requestError) {
      console.error(`Unable to import ${type} CSV.`, requestError)
      const responseData = requestError.response?.data
      const message = typeof responseData?.detail === 'string'
        ? responseData.detail
        : responseData?.file
          ? Array.isArray(responseData.file)
            ? responseData.file.join(' ')
            : responseData.file
          : `We could not import the ${type} CSV. Check the file and try again.`
      setCsvImport({
        busy: false,
        message,
        errors: Array.isArray(responseData?.errors) ? responseData.errors : [],
      })
    }
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    const slug = form.slug.trim() || form.name.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const payload = {
      ...form,
      slug,
      category: Number(form.category),
      price: form.price === '' ? null : Number(form.price),
      compare_price: form.compare_price === '' ? 0 : Number(form.compare_price),
      stock: Number(form.stock || 0),
      rating: Number(form.rating || 0),
      gallery: form.gallery.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      tags: form.tags.split(',').map((value) => value.trim()).filter(Boolean),
    }
    delete payload.id
    try {
      if (form.id) {
        await axios.patch(`${API_BASE_URL}/api/admin/products/${form.id}/`, payload, { headers })
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/products/`, payload, { headers })
      }
      setForm(null)
      setPage(1)
      setReloadKey((key) => key + 1)
    } catch (requestError) {
      console.error('Unable to save product changes.', requestError)
      const responseData = requestError.response?.data
      const firstFieldError = responseData && typeof responseData === 'object'
        ? Object.values(responseData).flat().find((value) => typeof value === 'string')
        : null
      setFormError(firstFieldError || 'We could not save this product. Check the fields and try again.')
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.name}" from the catalog?`)) return
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/products/${product.id}/`, { headers })
      setReloadKey((key) => key + 1)
    } catch (requestError) {
      console.error('Unable to delete product.', requestError)
      setProductsState((current) => ({
        ...current,
        error: 'We could not delete this product. Please try again.',
      }))
    }
  }

  const textField = (key, label, options = {}) => (
    <label className={`text-sm font-medium text-[#514542] ${options.className || ''}`}>
      {label}
      {options.multiline ? (
        <textarea
          required={options.required}
          rows={options.rows || 3}
          value={form[key]}
          onChange={(event) => updateForm(key, event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-white px-3 py-2.5 font-normal"
        />
      ) : (
        <input
          type={options.type || 'text'}
          required={options.required}
          step={options.step}
          min={options.min}
          value={form[key]}
          onChange={(event) => updateForm(key, event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-white px-3 py-2.5 font-normal"
        />
      )}
    </label>
  )

  return (
    <div className="section-shell space-y-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Staff workspace</div>
          <h1 className="mt-2 text-4xl font-semibold text-[#2d1b21]">Product catalog</h1>
          <p className="mt-2 text-sm text-[#645761]">Add products, update details, pricing, availability, and builder selections.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin" className="rounded-full border border-[#E9D8D2] bg-white px-4 py-2.5 text-sm font-medium text-[#514542]">
            Order dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              setCategoryFormOpen(true)
              setCategoryFormError('')
            }}
            className="rounded-full border border-[#E9D8D2] bg-white px-4 py-2.5 text-sm font-medium text-[#514542]"
          >
            Add category
          </button>
          <button
            type="button"
            onClick={startCreate}
            disabled={!categories.length}
            className="rounded-full bg-[#514542] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Add product
          </button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {categoryFormOpen && (
        <form onSubmit={saveCategory} className="space-y-4 rounded-[24px] border border-[#E9D8D2] bg-white p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#2d1b21]">Add catalog category</h2>
            <button type="button" onClick={() => setCategoryFormOpen(false)} className="text-sm text-[#645761] underline">
              Cancel
            </button>
          </div>
          {categoryFormError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{categoryFormError}</p>}
          <label className="block max-w-lg text-sm font-medium text-[#514542]">
            Category name
            <input
              required
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-white px-3 py-2.5 font-normal"
              placeholder="For example, Gift hampers"
            />
          </label>
          <button type="submit" disabled={categorySaving} className="rounded-full bg-[#514542] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {categorySaving ? 'Saving…' : 'Save category'}
          </button>
        </form>
      )}

      <section className="space-y-4 rounded-[24px] border border-[#E9D8D2] bg-white p-5 md:p-7">
        <div>
          <h2 className="text-xl font-semibold text-[#2d1b21]">Import catalog CSVs</h2>
          <p className="mt-2 text-sm leading-6 text-[#645761]">
            Admin-only, create-only imports. Categories must be imported before products that use them.
            Product rows can reference a category by name or slug; separate gallery and tag values with |.
            Invalid rows or duplicates prevent the entire file from being imported.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => downloadCsvTemplate('categories')} className="rounded-full border border-[#E9D8D2] px-4 py-2.5 text-sm font-medium text-[#514542]">
            Download category template
          </button>
          <button type="button" onClick={() => categoryCsvInput.current?.click()} disabled={csvImport.busy} className="rounded-full bg-[#514542] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            Import categories CSV
          </button>
          <button type="button" onClick={() => downloadCsvTemplate('products')} className="rounded-full border border-[#E9D8D2] px-4 py-2.5 text-sm font-medium text-[#514542]">
            Download product template
          </button>
          <button type="button" onClick={() => productCsvInput.current?.click()} disabled={csvImport.busy} className="rounded-full bg-[#514542] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            Import products CSV
          </button>
          <input
            ref={categoryCsvInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => importCsv('categories', event)}
          />
          <input
            ref={productCsvInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => importCsv('products', event)}
          />
        </div>
        {csvImport.busy && <p role="status" className="text-sm text-[#645761]">Importing CSV…</p>}
        {csvImport.message && (
          <div role={csvImport.errors.length ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-sm ${csvImport.errors.length ? 'bg-red-50 text-red-800' : 'bg-[#F5EFE6] text-[#514542]'}`}>
            <p>{csvImport.message}</p>
            {csvImport.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1">
                {csvImport.errors.slice(0, 20).map((rowError, index) => (
                  <li key={`${rowError.row}-${index}`}>
                    Row {rowError.row}: {Object.entries(rowError.errors || {}).map(([field, messages]) => (
                      `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
                    )).join('; ')}
                  </li>
                ))}
                {csvImport.errors.length > 20 && <li>And {csvImport.errors.length - 20} more row errors.</li>}
              </ul>
            )}
          </div>
        )}
      </section>

      {!categories.length && !categoriesState.loading && !categoriesState.error && (
        <p role="status" className="rounded-xl bg-[#F5EFE6] px-4 py-3 text-sm text-[#514542]">
          No categories yet. Add a category to enable product creation.
        </p>
      )}

      {form && (
        <form onSubmit={saveProduct} className="space-y-5 rounded-[24px] border border-[#E9D8D2] bg-white p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#2d1b21]">{form.id ? 'Edit product' : 'Add product'}</h2>
            <button type="button" onClick={() => setForm(null)} className="text-sm text-[#645761] underline">Cancel</button>
          </div>
          {formError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{formError}</p>}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {textField('name', 'Product name', { required: true })}
            {textField('slug', 'URL slug')}
            <label className="text-sm font-medium text-[#514542]">
              Category
              <select
                required
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-white px-3 py-2.5 font-normal"
              >
                <option value="">Choose category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            {textField('price', 'Sale price (₹)', { type: 'number', min: '0', step: '0.01' })}
            {textField('compare_price', 'Compare-at price (₹)', { type: 'number', min: '0', step: '0.01' })}
            {textField('stock', 'Stock quantity', { type: 'number', min: '0', step: '1' })}
            {textField('short_description', 'Short description', { className: 'md:col-span-2' })}
            {textField('image', 'Main image URL', { required: true, className: 'md:col-span-2' })}
            {textField('description', 'Full description', { multiline: true, rows: 4, className: 'md:col-span-2 lg:col-span-3' })}
            {textField('gallery', 'Gallery image URLs (one per line)', { multiline: true, rows: 3, className: 'md:col-span-2' })}
            {textField('tags', 'Tags (comma-separated)')}
            {textField('badge', 'Badge')}
            {textField('occasion', 'Occasion')}
            {textField('rating', 'Rating', { type: 'number', min: '0', max: '5', step: '0.1' })}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {[
              ['is_available', 'Available for purchase'],
              ['is_featured', 'Featured product'],
              ['is_builder_only', 'Builder-only selection'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-[#514542]">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(event) => updateForm(key, event.target.checked)}
                  className="h-4 w-4 accent-[#514542]"
                />
                {label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#645761]">Builder-only selections stay out of the Shop. Customer-facing products need a sale price.</p>
            <button type="submit" disabled={saving} className="rounded-full bg-[#514542] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-[24px] border border-[#E9D8D2] bg-white">
        <div className="grid gap-3 border-b border-[#E9D8D2] p-5 md:grid-cols-3">
          <label className="text-sm font-medium text-[#514542]">
            Search products
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Name, slug, or category"
              className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-[#514542]">
            Category
            <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1) }} className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-3 py-2.5 font-normal">
              <option value="">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-[#514542]">
            Product type
            <select value={builderFilter} onChange={(event) => { setBuilderFilter(event.target.value); setPage(1) }} className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-[#F5EFE6] px-3 py-2.5 font-normal">
              <option value="all">All products</option>
              <option value="false">Shop products</option>
              <option value="true">Builder-only selections</option>
            </select>
          </label>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-[#645761]">{count} products</p>
          {loading && <span role="status" className="text-sm text-[#645761]">Loading…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#F5EFE6] text-[#514542]">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Stock</th>
                <th className="px-5 py-3 font-semibold">Visibility</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E7E1]">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-4">
                    <div className="font-medium">{product.name}</div>
                    <div className="mt-1 text-xs text-[#645761]">{product.slug}</div>
                  </td>
                  <td className="px-5 py-4">{product.category_name}</td>
                  <td className="px-5 py-4">{product.price == null ? '—' : formatMoney(Number(product.price))}</td>
                  <td className="px-5 py-4">{product.stock}</td>
                  <td className="px-5 py-4">
                    <div>{product.is_builder_only ? 'Builder only' : 'Shop'}</div>
                    <div className={`mt-1 text-xs ${product.is_available ? 'text-green-700' : 'text-[#8b4b4b]'}`}>
                      {product.is_available ? 'Available' : 'Unavailable'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => startEdit(product)} className="font-medium text-[#514542] underline">Edit</button>
                      <button type="button" onClick={() => deleteProduct(product)} className="font-medium text-red-700 underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr><td colSpan="6" className="px-5 py-10 text-center text-[#645761]">No products match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#E9D8D2] p-4">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#E9D8D2] px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-[#645761]">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-full border border-[#E9D8D2] px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      </section>
    </div>
  )
}

function SupportPage() {
  return (
    <div className="section-shell space-y-8 py-12">
      <header className="rounded-[28px] border border-[#E9D8D2] bg-white p-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Here to help</div>
        <h1 className="mt-2 text-4xl font-semibold text-[#2d1b21]">Support &amp; gifting information</h1>
        <p className="mt-3 text-[#645761]">Find answers about orders, delivery, returns, and corporate gifting.</p>
      </header>

      <section id="faqs" className="scroll-mt-8 rounded-[28px] border border-[#E9D8D2] bg-white p-8">
        <h2 className="text-2xl font-semibold text-[#2d1b21]">FAQs</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">How do I place an order?</h3>
            <p className="mt-2 text-sm leading-6 text-[#645761]">Choose gifts from the shop, add them to your cart, and continue to checkout.</p>
          </div>
          <div>
            <h3 className="font-semibold">Can I build a custom gift?</h3>
            <p className="mt-2 text-sm leading-6 text-[#645761]">
              Yes. Use the <Link className="font-medium text-[#7f3d52] underline" to="/builder">hamper builder</Link> to choose an occasion, gift style, and products.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Where can I track my order?</h3>
            <p className="mt-2 text-sm leading-6 text-[#645761]">
              Use the secure tracking link in your confirmation email, or sign in and open <Link className="font-medium text-[#7f3d52] underline" to="/account">My orders</Link>.
            </p>
          </div>
        </div>
      </section>

      <section id="shipping" className="scroll-mt-8 rounded-[28px] border border-[#E9D8D2] bg-white p-8">
        <h2 className="text-2xl font-semibold text-[#2d1b21]">Shipping</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#645761]">
          This development storefront currently displays a ₹199 shipping charge and an estimated delivery of 3–5 business days. These are demo settings and must be confirmed before launch.
        </p>
      </section>

      <section id="returns" className="scroll-mt-8 rounded-[28px] border border-[#E9D8D2] bg-white p-8">
        <h2 className="text-2xl font-semibold text-[#2d1b21]">Returns</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#645761]">
          A returns policy and store contact details have not been configured yet. They should be added before accepting live orders.
        </p>
      </section>

      <section id="corporate-gifting" className="scroll-mt-8 rounded-[28px] border border-[#E9D8D2] bg-white p-8">
        <h2 className="text-2xl font-semibold text-[#2d1b21]">Corporate gifting</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#645761]">
          Create a tailored gift using the hamper builder. Business enquiry contact details are not configured in this development storefront.
        </p>
        <Link to="/builder" className="mt-5 inline-flex rounded-full bg-[#2f1f25] px-5 py-3 text-sm font-medium text-white">
          Start a custom gift
        </Link>
      </section>
    </div>
  )
}

function HomePage({ products, addToCart, catalogLoading }) {
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState('')
  const featured = products.slice(0, 4)
  const trending = products.slice(1, 5)

  const subscribe = async (event) => {
    event.preventDefault()
    setNewsletterStatus('')
    try {
      await axios.post(`${API_BASE_URL}/api/newsletter/`, { email: newsletterEmail })
      setNewsletterStatus('Thanks for subscribing.')
      setNewsletterEmail('')
    } catch (error) {
      console.error('Unable to subscribe to the newsletter.', error)
      setNewsletterStatus(
        error.response?.data?.email?.[0] || 'We could not subscribe you. Please try again.',
      )
    }
  }

  return (
    <div className="pb-20">
      <section className="section-shell pt-10 md:pt-16">
        <div className="overflow-hidden rounded-[32px] border border-[#f5dfe7] bg-[#fff] shadow-[0_20px_60px_rgba(122,79,99,0.12)]">
          <div className="grid items-center gap-10 px-6 py-8 md:grid-cols-2 md:px-10 lg:px-12 lg:py-12">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f4d7dd] bg-[#fff2f6] px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[#7f3d52]">
                <Sparkles size={14} />
                Curated gifting experiences
              </div>

              <div className="space-y-4">
                <h1 className="max-w-xl text-4xl font-bold leading-tight text-[#2d1b21] md:text-5xl lg:text-6xl">
                  Thoughtful gifts, beautifully handcrafted for every celebration.
                </h1>
                <p className="max-w-lg text-lg text-[#655963]">
                  Build a premium hamper or bouquet that matches the moment, your budget, and your story.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/builder"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2f1f25] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4b2d3c]"
                >
                  Build Your Hamper
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-full border border-[#ead7dc] bg-[#fff] px-6 py-3 text-sm font-semibold text-[#2f1f25] transition hover:border-[#d9bbc5]"
                >
                  Explore Collections
                </Link>
              </div>

              <div className="flex flex-wrap gap-10 pt-4 text-sm text-[#61535d]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-[#7f3d52]" size={18} />
                  Premium quality
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="text-[#7f3d52]" size={18} />
                  Pan-India delivery
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-3 top-10 h-24 w-24 rounded-full bg-[#f7dfe6] blur-2xl" />
              <div className="absolute -right-4 bottom-10 h-28 w-28 rounded-full bg-[#f3e7d4] blur-2xl" />
              <img
                src="https://images.unsplash.com/photo-1528747045269-390fe33c19f2?auto=format&fit=crop&w=1200&q=80"
                alt="Gift hamper product"
                className="relative h-[520px] w-full rounded-[28px] object-cover shadow-[0_30px_80px_rgba(99,72,80,0.18)]"
              />
              <div className="absolute bottom-4 left-4 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur-md">
                <div className="text-xs uppercase tracking-[0.14em] text-[#8a6b73]">Made personal</div>
                <div className="mt-2 text-xl font-semibold text-[#2d1b21]">A thoughtful touch, every time</div>
                <div className="mt-1 text-sm text-[#6b5861]">Designed around your moment</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pt-16">
        <SectionHeading eyebrow="Shop by occasion" title="Thoughtful gifting for every moment" />
        <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <div key={category.name} className="rounded-[28px] border border-[#f7dfe4] bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f9e6eb] text-2xl">
                {category.icon}
              </div>
              <div className="text-lg font-semibold text-[#2e1d24]">{category.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell pt-16">
        <div className="rounded-[32px] bg-[#f9e7ed] p-6 md:p-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Build your own gift hamper</div>
              <h2 className="mt-2 text-3xl font-bold text-[#2d1b21]">Create a hamper that feels personal.</h2>
            </div>
            <Link
              to="/builder"
              className="inline-flex items-center gap-2 rounded-full bg-[#2f1f25] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#4b2d3c]"
            >
              Start customising
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell pt-16">
        <SectionHeading eyebrow="Featured collections" title="Handpicked favourites" />
        {catalogLoading ? (
          <CatalogLoadingState />
        ) : featured.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} addToCart={addToCart} />
            ))}
          </div>
        ) : (
          <CatalogEmptyState />
        )}
      </section>

      <section className="section-shell pt-16">
        <SectionHeading eyebrow="Best sellers" title="Trending bouquets & hampers" />
        {catalogLoading ? (
          <CatalogLoadingState />
        ) : trending.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {trending.map((product) => (
              <ProductCard key={product.id} product={product} addToCart={addToCart} />
            ))}
          </div>
        ) : (
          <CatalogEmptyState />
        )}
      </section>

      <section className="section-shell pt-16">
        <div className="grid gap-6 md:grid-cols-3">
          <InfoCard icon={<PackageCheck size={20} />} title="Custom packaging" text="Add name tags, message cards, and premium wrapping to reflect the story behind the gift." />
          <InfoCard icon={<Check size={20} />} title="Thoughtful selections" text="Choose sweet treats, floral accents, and keepsakes that match the moment you are celebrating." />
          <InfoCard icon={<Truck size={20} />} title="Reliable delivery" text="Smooth dispatch and tracked gifting support for birthdays, anniversaries, and corporate surprises." />
        </div>
      </section>

      <section className="section-shell pt-16">
        <div className="rounded-[32px] bg-[#fff5f0] p-8 md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Stay in the loop</div>
              <h2 className="mt-3 text-3xl font-bold text-[#2d1b21]">Subscribe for fresh drops and gifting inspiration.</h2>
            </div>
            <form onSubmit={subscribe} className="flex flex-col gap-3">
              <div className="flex gap-3">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="Enter your email"
                className="h-12 flex-1 rounded-full border border-[#efd7df] bg-white px-5 text-sm outline-none ring-0 placeholder:text-[#8e7d84]"
              />
              <button type="submit" className="rounded-full bg-[#2f1f25] px-5 py-3 text-sm font-medium text-white">
                Join now
              </button>
              </div>
              {newsletterStatus && <p role="status" className="text-sm">{newsletterStatus}</p>}
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

function ShopPage({ products, addToCart, catalogLoading }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'All')
  const [searchValue, setSearchValue] = useState('')
  const [sortBy, setSortBy] = useState('featured')

  useEffect(() => {
    setCategoryFilter(searchParams.get('category') || 'All')
  }, [searchParams])

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const categoryMatch = categoryFilter === 'All' || product.category === categoryFilter
      const searchMatch =
        product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        product.shortDescription.toLowerCase().includes(searchValue.toLowerCase())
      return categoryMatch && searchMatch
    })

    const sorted = [...filtered]
    if (sortBy === 'low') {
      sorted.sort((a, b) => a.price - b.price)
    }
    if (sortBy === 'high') {
      sorted.sort((a, b) => b.price - a.price)
    }
    if (sortBy === 'new') {
      sorted.sort((a, b) => b.id - a.id)
    }
    return sorted
  }, [products, categoryFilter, searchValue, sortBy])

  return (
    <div className="section-shell py-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Curated collection</div>
          <h1 className="mt-2 text-4xl font-bold text-[#2d1b21]">Shop all gifting essentials</h1>
        </div>

        <div className="flex w-full items-center gap-3 rounded-full border border-[#ecdfe4] bg-white px-4 py-3 md:max-w-md">
          <Search size={18} className="text-[#7d6974]" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search gifts, hampers, flowers..."
            className="w-full border-0 bg-transparent text-sm text-[#2f1f25] outline-none placeholder:text-[#8c7b80]"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {['All', ...categories.map((item) => item.name)].map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => {
              setCategoryFilter(category)
              setSearchParams(category === 'All' ? {} : { category })
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              categoryFilter === category
                ? 'bg-[#2f1f25] text-white'
                : 'border border-[#ebdfe5] bg-white text-[#503d45]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 rounded-[24px] border border-[#efdfe5] bg-white p-4 shadow-sm">
        <div className="text-sm text-[#665761]">
          {catalogLoading ? 'Loading products...' : `Showing ${visibleProducts.length} products`}
        </div>
        <label className="flex items-center gap-2 text-sm text-[#5d4b52]">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-full border border-[#ecdfe4] bg-[#fffaf7] px-3 py-2 text-sm text-[#2f1f25] outline-none"
          >
            <option value="featured">Featured</option>
            <option value="low">Price low to high</option>
            <option value="high">Price high to low</option>
            <option value="new">New arrivals</option>
          </select>
        </label>
      </div>

      {catalogLoading ? (
        <CatalogLoadingState />
      ) : visibleProducts.length ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
        </div>
      ) : (
        <CatalogEmptyState />
      )}
    </div>
  )
}

function ProductPage({ products, addToCart }) {
  const { id } = useParams()
  const product = products.find((item) => String(item.id) === id) || products[0]
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  if (!product) {
    return <div className="section-shell py-24 text-center text-[#5c4e52]">Product not found.</div>
  }

  const gallery = product.gallery?.length ? product.gallery : [product.image]
  const selectedImage = gallery[selectedImageIndex] || product.image
  const relatedProducts = products.filter((item) => item.id !== product.id).slice(0, 3)

  return (
    <div className="section-shell py-12">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-[#f3dfe6] bg-white p-4 shadow-sm">
            <img src={selectedImage} alt={product.name} className="h-[520px] w-full rounded-[24px] object-cover" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {gallery.map((image, index) => (
              <button
                key={`${product.id}-image-${index}`}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
                className={`overflow-hidden rounded-[22px] border-2 ${
                  selectedImage === image ? 'border-[#7f3d52]' : 'border-[#f0dfe6]'
                }`}
              >
                <img src={image} alt={`${product.name} view ${index + 1}`} className="h-28 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full bg-[#fff1f5] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#7f3d52]">
            {product.badge}
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-[#8a6d75]">{product.category}</div>
            <h1 className="mt-3 text-4xl font-bold text-[#2d1b21]">{product.name}</h1>
          </div>

          {product.rating > 0 && (
            <div className="flex items-center gap-2 text-[#f29b3a]">
              <Star size={18} fill="currentColor" />
              <span className="font-medium text-[#2f1f25]">{product.rating}</span>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold text-[#2f1f25]">{formatMoney(product.price)}</div>
            <div className="text-lg text-[#8a7881] line-through">{formatMoney(product.comparePrice || product.price)}</div>
          </div>

          <p className="text-lg leading-8 text-[#554c51]">{product.description}</p>

          <div className="grid gap-3 rounded-[24px] border border-[#f0dfe4] bg-[#fff] p-4 shadow-sm sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[#8d7080]">Availability</div>
              <div className="mt-2 font-medium text-[#2d1b21]">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-[#8d7080]">Delivery</div>
              <div className="mt-2 font-medium text-[#2d1b21]">3-5 business days</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => addToCart(product)}
              className="rounded-full bg-[#2f1f25] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#4b2d3c]"
            >
              Add to cart
            </button>
            <Link to="/shop" className="rounded-full border border-[#efdfe3] bg-white px-6 py-3 text-sm font-semibold text-[#2f1f25]">
              Continue shopping
            </Link>
          </div>

          <div className="space-y-3 rounded-[24px] border border-[#f3dfe5] bg-[#fff4f7] p-5 text-[#4d3b42]">
            <div className="flex items-center gap-3">
              <Check className="text-[#7f3d52]" size={18} />
              <span>Premium packaging included</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="text-[#7f3d52]" size={18} />
              <span>Personalisation available</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="text-[#7f3d52]" size={18} />
              <span>Gift note and message card included</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <SectionHeading eyebrow="Related picks" title="You may also love" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {relatedProducts.map((related) => (
            <ProductCard key={related.id} product={related} addToCart={addToCart} />
          ))}
        </div>
      </div>
    </div>
  )
}

function BuilderPage({ products, builderItems, builderItemsLoading, builderItemsError, addToCart }) {
  const navigate = useNavigate()
  const steps = [
    { key: 'occasion', label: 'Occasion', options: hamperOptions.occasions },
    { key: 'hamperType', label: 'Hamper Type', options: hamperOptions.hamperTypes },
    { key: 'budget', label: 'Budget', options: hamperOptions.budgets },
    { key: 'products', label: 'Products' },
    { key: 'personalisation', label: 'Personalisation' },
    { key: 'packaging', label: 'Packaging' },
    { key: 'preview', label: 'Preview' },
  ]

  const [currentStep, setCurrentStep] = useState(0)
  const [budgetWarning, setBudgetWarning] = useState('')
  const [customBudget, setCustomBudget] = useState('')
  const [builderCategory, setBuilderCategory] = useState('All')
  const builderChoices = [...products, ...builderItems]
  const builderCategories = [...new Set(builderChoices.map((product) => product.category))]
  const visibleBuilderChoices = builderCategory === 'All'
    ? builderChoices
    : builderChoices.filter((product) => product.category === builderCategory)
  const [builder, setBuilder] = useState({
    occasion: hamperOptions.occasions[0],
    hamperType: hamperOptions.hamperTypes[0],
    budget: hamperOptions.budgets[2],
    selectedProducts: [],
    packaging: 'standard',
    personalisation: {
      recipient: '',
      sender: '',
      message: '',
      card_message: '',
      preferred_colours: '',
      special_instructions: '',
    },
  })

  const currentConfig = steps[currentStep]
  const packagingOptions = [
    { id: 'standard', name: 'Standard packaging', price: 0 },
    { id: 'premium_box', name: 'Premium gift box', price: 199 },
    { id: 'luxury_basket', name: 'Luxury basket', price: 399 },
    { id: 'bouquet_wrap', name: 'Bouquet wrapping', price: 99 },
    { id: 'custom', name: 'Custom packaging', price: 299 },
  ]

  const totalValue = useMemo(
    () =>
      builder.selectedProducts.reduce(
        (sum, item) => sum + Number(item.price || 0) * item.quantity,
        0,
      ),
    [builder.selectedProducts],
  )
  const hasSelectionOnlyItems = builder.selectedProducts.some((item) => item.is_builder_only)
  const budgetValues = builder.budget.match(/\d[\d,]*/g) || []
  const budgetLimit = builder.budget.includes('+')
    ? Number.POSITIVE_INFINITY
    : Number((budgetValues[budgetValues.length - 1] || '0').replaceAll(',', ''))
  const packagingCharge =
    packagingOptions.find((option) => option.id === builder.packaging)?.price || 0
  const personalisationCharge = Object.values(builder.personalisation).some(Boolean) ? 49 : 0
  const estimatedTotal =
    totalValue + packagingCharge + personalisationCharge + (totalValue ? 199 : 0)

  const addProductToHamper = (product) => {
    const itemPrice = Number(product.price || 0)
    if (!product.is_builder_only && totalValue + itemPrice + packagingCharge + personalisationCharge > budgetLimit) {
      setBudgetWarning('That item would exceed your selected budget. Choose another item or increase your budget.')
      return
    }
    setBudgetWarning('')
    setBuilder((current) => {
      const existing = current.selectedProducts.find((item) => item.id === product.id)
      if (existing) {
        return {
          ...current,
          selectedProducts: current.selectedProducts.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        }
      }

      return {
        ...current,
        selectedProducts: [...current.selectedProducts, { ...product, quantity: 1 }],
      }
    })
  }

  const removeProductFromHamper = (productId) => {
    setBuilder((current) => ({
      ...current,
      selectedProducts: current.selectedProducts.filter((item) => item.id !== productId),
    }))
  }

  const updateProductQty = (productId, delta) => {
    setBuilder((current) => ({
      ...current,
      selectedProducts: current.selectedProducts
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    }))
  }

  const stepProgress = ((currentStep + 1) / steps.length) * 100

  const saveHamperToCart = () => {
    if (!builder.selectedProducts.length) {
      setBudgetWarning('Add at least one product before adding your hamper to the cart.')
      setCurrentStep(3)
      return
    }
    if (hasSelectionOnlyItems) {
      setBudgetWarning('Some selected items are previews only and need catalog setup before this hamper can be ordered.')
      setCurrentStep(6)
      return
    }
    if (estimatedTotal - 199 > budgetLimit) {
      setBudgetWarning('Your hamper is over budget. Adjust the items or select a higher budget.')
      setCurrentStep(3)
      return
    }
    addToCart({
      id: `custom-${Date.now()}`,
      name: builder.hamperType,
      category: 'Custom hamper',
      image: builder.selectedProducts[0].image,
      price: estimatedTotal - 199,
      quantity: 1,
      customHamper: {
        occasion: builder.occasion,
        hamper_type: builder.hamperType,
        budget: builder.budget,
        packaging: builder.packaging,
        personalisation: builder.personalisation,
        products: builder.selectedProducts.map(({ id, quantity }) => ({
          product_id: id,
          quantity,
        })),
      },
    })
    setBudgetWarning('')
    navigate('/cart')
  }

  return (
    <div className="section-shell py-12">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[30px] border border-[#f3dfe7] bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Custom hamper builder</div>
              <h1 className="mt-2 text-3xl font-bold text-[#2d1b21]">Design a gifting moment</h1>
            </div>
            <div className="rounded-full bg-[#fff3f7] px-4 py-2 text-sm font-medium text-[#7f3d52]">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>

          <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-[#f5eaee]">
            <div className="h-full rounded-full bg-[#7f3d52] transition-all" style={{ width: `${stepProgress}%` }} />
          </div>

          <div className="mb-8">
            <div className="text-sm uppercase tracking-[0.18em] text-[#8a6674]">{currentConfig.label}</div>
            {currentConfig.options && <div className="mt-4 flex flex-wrap gap-3">
              {currentConfig.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setBuilder((current) => ({ ...current, [currentConfig.key]: option }))
                    setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
                  }}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    builder[currentConfig.key] === option
                      ? 'bg-[#2f1f25] text-white'
                      : 'border border-[#ecdfe3] bg-[#fffaf7] text-[#473b40]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>}
            {currentStep === 2 && (
              <label className="mt-5 block max-w-xs text-sm font-medium text-[#514542]">
                Or enter a custom budget
                <input
                  type="number"
                  min="1"
                  value={customBudget}
                  onChange={(event) => {
                    setCustomBudget(event.target.value)
                    if (event.target.value) {
                      setBuilder((current) => ({ ...current, budget: `₹${event.target.value}` }))
                    }
                  }}
                  placeholder="Enter amount in ₹"
                  className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-white px-4 py-3"
                />
              </label>
            )}
          </div>

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#2d1b21]">Select products</h2>
                <span className="text-sm text-[#514542]">{builder.selectedProducts.length} selected</span>
              </div>
              {budgetWarning && <p role="status" className="rounded-xl bg-[#E9D8D2] px-4 py-3 text-sm text-[#514542]">{budgetWarning}</p>}
              <label className="block max-w-sm text-sm font-medium text-[#514542]">
                Filter by category
                <select
                  value={builderCategory}
                  onChange={(event) => setBuilderCategory(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-white px-4 py-3"
                >
                  <option value="All">All categories</option>
                  {builderCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              {builderItemsError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{builderItemsError}</p>}
              {builderItemsLoading && <CatalogLoadingState />}

              <div className="grid gap-5 md:grid-cols-2">
                {visibleBuilderChoices.map((product) => {
                  const selected = builder.selectedProducts.some((item) => item.id === product.id)
                  return (
                    <div key={product.id} className="rounded-[22px] border border-[#f0dfe5] bg-[#fff] p-3 shadow-sm">
                      <img src={product.image} alt={product.name} className="h-36 w-full rounded-[18px] object-cover" />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-[#7a6470]">{product.category}</div>
                          <div className="mt-1 text-lg font-semibold text-[#2d1b21]">{product.name}</div>
                        </div>
                        {product.is_builder_only
                          ? <div className="text-xs font-medium text-[#7f3d52]">Selection only</div>
                          : <div className="text-base font-semibold text-[#2d1b21]">{formatMoney(product.price)}</div>}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#5c4e52]">{product.shortDescription}</p>
                      <button
                        type="button"
                        onClick={() => addProductToHamper(product)}
                        className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-medium ${
                          selected ? 'bg-[#f7e1e9] text-[#7f3d52]' : 'bg-[#2f1f25] text-white'
                        }`}
                      >
                        {selected ? 'Add more' : 'Add to hamper'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['recipient', 'Recipient name'],
                ['sender', 'Sender name'],
                ['message', 'Personalised message'],
                ['card_message', 'Greeting card message'],
                ['preferred_colours', 'Preferred colours'],
                ['special_instructions', 'Special instructions'],
              ].map(([key, label]) => (
                <label key={key} className="text-sm font-medium text-[#514542]">
                  {label}
                  {['message', 'card_message', 'special_instructions'].includes(key) ? (
                    <textarea
                      rows="3"
                      maxLength="500"
                      value={builder.personalisation[key]}
                      onChange={(event) => setBuilder((current) => ({
                        ...current,
                        personalisation: { ...current.personalisation, [key]: event.target.value },
                      }))}
                      className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-white px-4 py-3"
                    />
                  ) : (
                    <input
                      value={builder.personalisation[key]}
                      onChange={(event) => setBuilder((current) => ({
                        ...current,
                        personalisation: { ...current.personalisation, [key]: event.target.value },
                      }))}
                      className="mt-2 w-full rounded-xl border border-[#E9D8D2] bg-white px-4 py-3"
                    />
                  )}
                </label>
              ))}
              <div className="rounded-xl bg-[#F5EFE6] p-4 text-sm sm:col-span-2">
                <div className="font-semibold">Message preview</div>
                <p className="mt-2">{builder.personalisation.message || 'Your personal message will appear here.'}</p>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {packagingOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBuilder((current) => ({ ...current, packaging: option.id }))}
                  className={`rounded-2xl border p-4 text-left ${builder.packaging === option.id ? 'border-[#514542] bg-[#E9D8D2]' : 'border-[#E9D8D2] bg-white'}`}
                >
                  <span className="block font-semibold">{option.name}</span>
                  <span className="mt-1 block text-sm">{option.price ? formatMoney(option.price) : 'Included'}</span>
                </button>
              ))}
              {budgetWarning && <p role="status" className="sm:col-span-2 text-sm">{budgetWarning}</p>}
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4 rounded-2xl bg-[#F5EFE6] p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>Occasion: <strong>{builder.occasion}</strong></div>
                <div>Hamper type: <strong>{builder.hamperType}</strong></div>
                <div>Budget: <strong>{builder.budget}</strong></div>
                <div>Packaging: <strong>{packagingOptions.find((option) => option.id === builder.packaging)?.name}</strong></div>
              </div>
              <div className="border-t border-[#E9D8D2] pt-4">
                <div className="font-semibold">Personalised message</div>
                <p className="mt-1">{builder.personalisation.message || 'No message added'}</p>
              </div>
              <div className="border-t border-[#E9D8D2] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">Selected items</div>
                  <button type="button" onClick={() => setCurrentStep(3)} className="text-sm font-medium text-[#7f3d52] underline">
                    Edit items
                  </button>
                </div>
                <ul className="mt-2 list-inside list-disc text-sm">
                  {builder.selectedProducts.map((item) => (
                    <li key={item.id}>{item.name} × {item.quantity}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setCurrentStep(4)} className="text-sm font-medium text-[#7f3d52] underline">
                  Edit personalisation
                </button>
                <button type="button" onClick={() => setCurrentStep(5)} className="text-sm font-medium text-[#7f3d52] underline">
                  Edit packaging
                </button>
              </div>
              {hasSelectionOnlyItems && (
                <p role="status" className="rounded-xl bg-[#E9D8D2] px-4 py-3 text-sm text-[#514542]">
                  Some selected items are previews only and need catalog setup before this hamper can be ordered.
                </p>
              )}
              {budgetWarning && <p role="status" className="text-sm">{budgetWarning}</p>}
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
              className="rounded-full border border-[#ead7dc] bg-white px-5 py-2.5 text-sm font-medium text-[#2f1f25]"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentStep === steps.length - 1) {
                  saveHamperToCart()
                } else {
                  setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
                }
              }}
              disabled={currentStep === steps.length - 1 && hasSelectionOnlyItems}
              className="rounded-full bg-[#2f1f25] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {currentStep === steps.length - 1
                ? (hasSelectionOnlyItems ? 'Items need setup' : 'Add to cart')
                : 'Next'}
            </button>
          </div>
        </div>

        <aside className="rounded-[30px] border border-[#f3dfe7] bg-[#fff8fa] p-6 shadow-sm">
          <div className="mb-5 text-xs uppercase tracking-[0.18em] text-[#7f3d52]">Hamper summary</div>

          <div className="space-y-4 rounded-[24px] bg-white p-4">
            <div className="flex items-center justify-between text-sm text-[#5d4d53]">
              <span>Occasion</span>
              <span className="font-medium text-[#2d1b21]">{builder.occasion}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[#5d4d53]">
              <span>Style</span>
              <span className="font-medium text-[#2d1b21]">{builder.hamperType}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[#5d4d53]">
              <span>Budget</span>
              <span className="font-medium text-[#2d1b21]">{builder.budget}</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {builder.selectedProducts.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-[#ebd9df] bg-[#fff] p-5 text-sm text-[#6d5862]">
                No products added yet. Pick a few items in the last step to build your hamper.
              </div>
            ) : (
              builder.selectedProducts.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-[20px] border border-[#f0dfe5] bg-white p-3">
                  <img src={item.image} alt={item.name} className="h-16 w-16 rounded-[14px] object-cover" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#2d1b21]">{item.name}</div>
                    <div className="text-xs text-[#7a6570]">
                      {item.is_builder_only ? 'Selection only' : formatMoney(item.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-[#f0dfe5] px-2 py-1">
                    <button type="button" onClick={() => updateProductQty(item.id, -1)} className="text-[#4b2d3c]">
                      <Minus size={14} />
                    </button>
                    <span className="min-w-5 text-center text-sm font-medium text-[#2d1b21]">{item.quantity}</span>
                    <button type="button" onClick={() => updateProductQty(item.id, 1)} className="text-[#4b2d3c]">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeProductFromHamper(item.id)} className="text-[#8e5d66]">
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-[24px] bg-[#2f1f25] p-5 text-white">
            {hasSelectionOnlyItems ? (
              <p className="text-sm text-[#E9D8D2]">Final summary will be available after these selections are configured.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm text-[#ebdfe5]">
                  <span>Estimated total</span>
                  <span>{formatMoney(estimatedTotal)}</span>
                </div>
                <div className="mt-4 space-y-1 text-sm text-[#E9D8D2]">
                  <div className="flex justify-between"><span>Products</span><span>{formatMoney(totalValue)}</span></div>
                  <div className="flex justify-between"><span>Packaging</span><span>{formatMoney(packagingCharge)}</span></div>
                  <div className="flex justify-between"><span>Personalisation</span><span>{formatMoney(personalisationCharge)}</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span>{formatMoney(totalValue ? 199 : 0)}</span></div>
                </div>
                <div className="mt-4 text-2xl font-bold">{formatMoney(estimatedTotal)}</div>
              </>
            )}
            {!hasSelectionOnlyItems && estimatedTotal - 199 > budgetLimit && (
              <p className="mt-2 text-sm text-[#E9D8D2]">Over selected budget</p>
            )}
            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#2f1f25]"
            >
              Review hamper
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function CartPage({ cart, removeFromCart, updateCartQty, subtotal }) {
  if (cart.length === 0) {
    return (
      <div className="section-shell py-20 text-center">
        <div className="mx-auto max-w-lg rounded-[28px] border border-[#f0dfe6] bg-white p-10 shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f9e6eb] text-[#7f3d52]">
            <ShoppingBag size={28} />
          </div>
          <h1 className="text-3xl font-bold text-[#2d1b21]">Your cart is empty</h1>
          <p className="mt-3 text-[#665861]">Discover premium hampers, bouquets, and personalised gifting picks.</p>
          <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2f1f25] px-5 py-3 text-sm font-medium text-white">
            Shop collection
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="section-shell py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Your basket</div>
          <h1 className="mt-2 text-4xl font-bold text-[#2d1b21]">Shopping cart</h1>
        </div>
        <div className="rounded-full bg-[#fff1f5] px-4 py-2 text-sm font-medium text-[#7f3d52]">
          {cart.reduce((total, item) => total + item.quantity, 0)} items
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          {cart.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 rounded-[28px] border border-[#f0dfe5] bg-white p-4 shadow-sm md:flex-row md:items-center">
              <img src={item.image} alt={item.name} className="h-28 w-28 rounded-[22px] object-cover" />
              <div className="flex-1">
                <div className="text-xl font-semibold text-[#2d1b21]">{item.name}</div>
                <div className="mt-1 text-sm text-[#7a6974]">{item.category || 'Custom gift'}</div>
                <div className="mt-3 text-lg font-semibold text-[#2d1b21]">{formatMoney(item.price)}</div>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-[#efdae2] bg-[#fffaf7] px-2 py-1.5">
                <button type="button" onClick={() => updateCartQty(item.id, -1)} className="p-1 text-[#4b2d3c]">
                  <Minus size={16} />
                </button>
                <span className="min-w-6 text-center text-sm font-medium text-[#2d1b21]">{item.quantity}</span>
                <button type="button" onClick={() => updateCartQty(item.id, 1)} className="p-1 text-[#4b2d3c]">
                  <Plus size={16} />
                </button>
              </div>

              <button type="button" onClick={() => removeFromCart(item.id)} className="text-sm font-medium text-[#8f5867]">
                Remove
              </button>
            </div>
          ))}
        </div>

        <aside className="rounded-[28px] border border-[#f0dfe5] bg-[#fff8fa] p-6 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-[#7f3d52]">Summary</div>
          <div className="mt-6 space-y-4 text-[#4a3d43]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{subtotal > 0 ? '₹199' : '₹0'}</span>
            </div>
          </div>
          <div className="my-5 h-px bg-[#efdfe5]" />
          <div className="flex items-center justify-between text-xl font-bold text-[#2d1b21]">
            <span>Total</span>
            <span>{formatMoney(subtotal > 0 ? subtotal + 199 : 0)}</span>
          </div>
          <Link to="/checkout" className="mt-6 block rounded-full bg-[#2f1f25] px-5 py-3 text-center text-sm font-medium text-white">
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  )
}

function CheckoutPage({ cart, subtotal, auth, removeFromCart, updateCartQty, onOrderPlaced }) {
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [createdOrder, setCreatedOrder] = useState(null)
  const total = subtotal > 0 ? subtotal + 199 : 0

  const handleSubmit = async (event) => {
    event.preventDefault()
    setCheckoutError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const items = cart.map((item) => item.customHamper
      ? { quantity: 1, custom_hamper: item.customHamper }
      : { product_id: Number(item.id), quantity: item.quantity })

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/orders/`,
        {
          customer_name: formData.get('customer_name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          delivery_address: `${formData.get('address')}, ${formData.get('city')}, ${formData.get('postal_code')}`,
          items,
        },
        {
          headers: auth ? { Authorization: `Bearer ${auth.access}` } : {},
        },
      )
      setCreatedOrder(response.data)
      onOrderPlaced()
    } catch (error) {
      console.error('Unable to create the order.', error)
      setCheckoutError(
        error.response?.data?.items?.[0] ||
        error.response?.data?.detail ||
        'We could not place your order. Please check your details and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (createdOrder) {
    return (
      <div className="section-shell py-20">
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E9D8D2] bg-white p-10 text-center shadow-sm">
          <Check size={36} className="mx-auto text-[#514542]" />
          <h1 className="mt-4 text-4xl font-bold">Order received</h1>
          <p className="mt-3">
            Order #{createdOrder.id} has been placed.{' '}
            {createdOrder.confirmation_email_status === 'sent'
              ? `A confirmation email was sent to ${createdOrder.email}.`
              : `We could not send the confirmation email to ${createdOrder.email}; please contact support.`}
            {' '}Payment is pending.
          </p>
          <p className="mt-4 font-semibold">Total: {formatMoney(Number(createdOrder.total))}</p>
          {createdOrder.tracking_token && (
            <Link
              to={`/track-order?token=${encodeURIComponent(createdOrder.tracking_token)}`}
              className="mt-6 inline-block rounded-full border border-[#514542] px-6 py-3 font-medium text-[#514542]"
            >
              Track this order
            </Link>
          )}
          <Link to="/shop" className="mt-6 inline-block rounded-full bg-[#514542] px-6 py-3 text-white">Continue shopping</Link>
        </div>
      </div>
    )
  }

  if (!cart.length) {
    return (
      <div className="section-shell py-20 text-center">
        <h1 className="text-4xl font-bold">Nothing to check out yet</h1>
        <Link to="/shop" className="mt-6 inline-block rounded-full bg-[#514542] px-6 py-3 text-white">Browse gifts</Link>
      </div>
    )
  }

  return (
    <div className="section-shell py-12">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Checkout</div>
        <h1 className="mt-2 text-4xl font-bold text-[#2d1b21]">Complete your order</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-[28px] border border-[#f1dfe5] bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Field name="customer_name" label="Full name" placeholder="Your name" required />
            <Field name="email" label="Email" type="email" placeholder="you@example.com" required />
            <Field name="phone" label="Phone" placeholder="+91 98765 43210" />
            <Field name="city" label="City" placeholder="Bengaluru" required />
            <Field name="postal_code" label="Postal code" placeholder="560001" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#3c2c32]">Delivery address</label>
            <textarea
              name="address"
              rows="4"
              placeholder="House number, street, locality, landmark"
              required
              className="w-full rounded-[20px] border border-[#efdfe5] bg-[#fffaf7] px-4 py-3 text-sm text-[#2f1f25] outline-none placeholder:text-[#887980]"
            />
          </div>
          {checkoutError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{checkoutError}</p>}
          <button type="submit" disabled={submitting} className="rounded-full bg-[#2f1f25] px-6 py-3 text-sm font-medium text-white disabled:opacity-60">
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </form>

        <aside className="rounded-[28px] border border-[#f1dfe5] bg-[#fff8fa] p-6 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-[#7f3d52]">Order summary</div>
          <div className="mt-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-sm text-[#5c4d52]">Your cart is empty.</div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#463b41]">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() => updateCartQty(item.id, -1)}
                        className="rounded-full border border-[#E9D8D2] p-1"
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                        onClick={() => updateCartQty(item.id, 1)}
                        className="rounded-full border border-[#E9D8D2] p-1"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="ml-2 text-[#7f3d52] underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <span>{formatMoney(item.price * item.quantity)}</span>
                </div>
              ))
            )}
          </div>
          <div className="my-5 h-px bg-[#efdfe5]" />
          <div className="space-y-3 text-sm text-[#483f45]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>₹199</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-xl font-bold text-[#2d1b21]">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({ name, label, placeholder, type = 'text', required = false }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#3c2c32]">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-[18px] border border-[#efdfe5] bg-[#fffaf7] px-4 py-3 text-sm text-[#2f1f25] outline-none placeholder:text-[#887980]"
      />
    </div>
  )
}

function ProductCard({ product, addToCart }) {
  return (
    <article className="group overflow-hidden rounded-[28px] border border-[#f0dfe5] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(122,79,99,0.10)]">
      <div className="relative overflow-hidden">
        <img src={product.image} alt={product.name} className="h-72 w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7f3d52]">
          {product.badge}
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[#8a6c74]">
          <span>{product.category}</span>
          {product.rating > 0 && (
            <span className="flex items-center gap-1 font-medium text-[#f29b3a]">
              <Star size={12} fill="currentColor" />
              {product.rating}
            </span>
          )}
        </div>

        <div>
          <Link to={`/product/${product.id}`} className="text-xl font-semibold text-[#2d1b21] hover:text-[#7f3d52]">
            {product.name}
          </Link>
          <p className="mt-2 text-sm leading-6 text-[#5d4e54]">{product.shortDescription}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#2d1b21]">{formatMoney(product.price)}</span>
            <span className="text-sm text-[#977d85] line-through">{formatMoney(product.comparePrice || product.price)}</span>
          </div>
          <button type="button" onClick={() => addToCart(product)} className="rounded-full bg-[#2f1f25] px-4 py-2 text-sm font-medium text-white">
            Add to cart
          </button>
        </div>
      </div>
    </article>
  )
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">{eyebrow}</div>
        <h2 className="mt-2 text-3xl font-bold text-[#2d1b21]">{title}</h2>
      </div>
    </div>
  )
}

function InfoCard({ icon, title, text }) {
  return (
    <div className="rounded-[28px] border border-[#f5dfe7] bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f9e6eb] text-[#7f3d52]">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-[#2d1b21]">{title}</h3>
      <p className="mt-3 text-[#5c4f55]">{text}</p>
    </div>
  )
}

function CatalogEmptyState() {
  return (
    <div className="mt-8 rounded-[28px] border border-[#E9D8D2] bg-white p-8 text-center">
      <h3 className="text-2xl font-semibold">Our collection is being prepared</h3>
      <p className="mt-2 text-sm">Please check back soon for gifts added to our catalog.</p>
    </div>
  )
}

function CatalogLoadingState() {
  return (
    <div role="status" className="mt-8 rounded-[28px] border border-[#E9D8D2] bg-white p-8 text-center">
      Loading gifts from the shop...
    </div>
  )
}

function Footer({ auth }) {
  return (
    <footer className="mt-20 border-t border-[#f3dfe5] bg-[#fff]">
      <div className="section-shell grid gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/sticker.png"
              alt="Belongings"
              className="h-11 w-28 rounded-xl border border-[#E9D8D2] object-cover object-center shadow-sm"
            />
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#8a6b73]">Boutique gifting</div>
            </div>
          </div>
          <p className="mt-4 text-[#645761]">Premium gifting curated for birthdays, weddings, anniversaries, and surprise moments.</p>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#2f1f25]">Shop</div>
          <ul className="space-y-3 text-[#645761]">
            <li><Link className="hover:text-[#7f3d52]" to="/shop?category=Gift%20hampers">Gift hampers</Link></li>
            <li><Link className="hover:text-[#7f3d52]" to="/shop?category=Gift%20bouquets">Bouquets</Link></li>
            <li><Link className="hover:text-[#7f3d52]" to="/builder">Custom gifts</Link></li>
            <li><Link className="hover:text-[#7f3d52]" to="/support#corporate-gifting">Corporate gifting</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#2f1f25]">Support</div>
          <ul className="space-y-3 text-[#645761]">
            <li><Link className="hover:text-[#7f3d52]" to="/support#faqs">FAQs</Link></li>
            <li><Link className="hover:text-[#7f3d52]" to="/track-order">Track order</Link></li>
            <li><Link className="hover:text-[#7f3d52]" to="/support#shipping">Shipping</Link></li>
            <li><Link className="hover:text-[#7f3d52]" to="/support#returns">Returns</Link></li>
            {auth?.user?.is_staff && <li><Link className="hover:text-[#7f3d52]" to="/admin">Admin dashboard</Link></li>}
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#2f1f25]">Contact</div>
          <p className="text-[#645761]">Store email, phone, and location can be added in the business configuration.</p>
        </div>
      </div>
    </footer>
  )
}

export default App
