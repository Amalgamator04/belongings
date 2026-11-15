import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  ArrowRight,
  Check,
  Gift,
  Mail,
  MapPin,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react'
import { BrowserRouter, Link, NavLink, Route, Routes, useParams } from 'react-router-dom'

import { categories, hamperOptions, products, testimonials } from './data'

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)

function App() {
  const [cart, setCart] = useState([])
  const [shopProducts, setShopProducts] = useState(products)

  useEffect(() => {
    axios
      .get('http://localhost:8000/api/products/')
      .then((response) => {
        if (Array.isArray(response.data) && response.data.length > 0) {
          setShopProducts(response.data)
        }
      })
      .catch(() => {})
  }, [])

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
      <div className="min-h-screen bg-[#fffaf7] text-[#2f1f25]">
        <Header cartCount={cartCount} />

        <main>
          <Routes>
            <Route
              path="/"
              element={<HomePage products={shopProducts} addToCart={addToCart} />}
            />
            <Route
              path="/shop"
              element={<ShopPage products={shopProducts} addToCart={addToCart} />}
            />
            <Route
              path="/product/:id"
              element={<ProductPage products={shopProducts} addToCart={addToCart} />}
            />
            <Route
              path="/builder"
              element={<BuilderPage products={shopProducts} addToCart={addToCart} />}
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
              element={<CheckoutPage cart={cart} subtotal={cartSubtotal} />}
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  )
}

function Header({ cartCount }) {
  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    { label: 'Hamper Builder', to: '/builder' },
    { label: 'Cart', to: '/cart' },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-[#f5dfe7] bg-[#fffaf7]/90 backdrop-blur-xl">
      <div className="section-shell flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f9dfe8] text-[#7f3d52] shadow-sm">
            <Gift size={20} />
          </div>
          <div>
            <div className="text-lg font-bold tracking-[0.08em] text-[#2e1d24] uppercase">
              Melt & Muse
            </div>
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
          <button
            type="button"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-[#f3dbe2] bg-white text-[#4f3941] shadow-sm md:flex"
            aria-label="Search products"
          >
            <Search size={18} />
          </button>
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
    </header>
  )
}

function HomePage({ products, addToCart }) {
  const featured = products.slice(0, 4)
  const trending = products.slice(1, 5)

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
                <div className="text-xs uppercase tracking-[0.14em] text-[#8a6b73]">Best selling</div>
                <div className="mt-2 text-xl font-semibold text-[#2d1b21]">Blush Bloom Hamper</div>
                <div className="mt-1 text-sm text-[#6b5861]">From ₹1,599</div>
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
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
        </div>
      </section>

      <section className="section-shell pt-16">
        <SectionHeading eyebrow="Best sellers" title="Trending bouquets & hampers" />
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {trending.map((product) => (
            <ProductCard key={product.id} product={product} addToCart={addToCart} />
          ))}
        </div>
      </section>

      <section className="section-shell pt-16">
        <div className="grid gap-6 md:grid-cols-3">
          <InfoCard icon={<PackageCheck size={20} />} title="Custom packaging" text="Add name tags, message cards, and premium wrapping to reflect the story behind the gift." />
          <InfoCard icon={<Check size={20} />} title="Handpicked products" text="We curate a premium mix of beauty, sweets, floral accents, and keepsakes that match each vibe." />
          <InfoCard icon={<Truck size={20} />} title="Reliable delivery" text="Smooth dispatch and tracked gifting support for birthdays, anniversaries, and corporate surprises." />
        </div>
      </section>

      <section className="section-shell pt-16">
        <SectionHeading eyebrow="Happy customers" title="Loved by thoughtful gift-givers" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="rounded-[28px] border border-[#f5dfe7] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-1 text-[#f29b3a]">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="text-[#4b3d43]">“{testimonial.quote}”</p>
              <div className="mt-6 border-t border-[#f5e2e7] pt-4">
                <div className="font-semibold text-[#2d1b21]">{testimonial.name}</div>
                <div className="text-sm text-[#7a6974]">{testimonial.title}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell pt-16">
        <div className="rounded-[32px] bg-[#fff5f0] p-8 md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#7f3d52]">Stay in the loop</div>
              <h2 className="mt-3 text-3xl font-bold text-[#2d1b21]">Subscribe for fresh drops and gifting inspiration.</h2>
            </div>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="h-12 flex-1 rounded-full border border-[#efd7df] bg-white px-5 text-sm outline-none ring-0 placeholder:text-[#8e7d84]"
              />
              <button type="button" className="rounded-full bg-[#2f1f25] px-5 py-3 text-sm font-medium text-white">
                Join now
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ShopPage({ products, addToCart }) {
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [searchValue, setSearchValue] = useState('')
  const [sortBy, setSortBy] = useState('featured')

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
            onClick={() => setCategoryFilter(category)}
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
        <div className="text-sm text-[#665761]">Showing {visibleProducts.length} products</div>
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

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} addToCart={addToCart} />
        ))}
      </div>
    </div>
  )
}

function ProductPage({ products, addToCart }) {
  const { id } = useParams()
  const product = products.find((item) => String(item.id) === id) || products[0]
  const [selectedImage, setSelectedImage] = useState(product?.gallery?.[0] || product?.image)

  useEffect(() => {
    setSelectedImage(product?.gallery?.[0] || product?.image)
  }, [product])

  if (!product) {
    return <div className="section-shell py-24 text-center text-[#5c4e52]">Product not found.</div>
  }

  const relatedProducts = products.filter((item) => item.id !== product.id).slice(0, 3)

  return (
    <div className="section-shell py-12">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-[#f3dfe6] bg-white p-4 shadow-sm">
            <img src={selectedImage} alt={product.name} className="h-[520px] w-full rounded-[24px] object-cover" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(product.gallery || [product.image]).map((image, index) => (
              <button
                key={`${product.id}-image-${index}`}
                type="button"
                onClick={() => setSelectedImage(image)}
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

          <div className="flex items-center gap-2 text-[#f29b3a]">
            <Star size={18} fill="currentColor" />
            <span className="font-medium text-[#2f1f25]">{product.rating}</span>
            <span className="text-[#75666d]">(128 reviews)</span>
          </div>

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

function BuilderPage({ products, addToCart }) {
  const steps = [
    { key: 'occasion', label: 'Occasion', options: hamperOptions.occasions },
    { key: 'hamperType', label: 'Hamper Type', options: hamperOptions.hamperTypes },
    { key: 'budget', label: 'Budget', options: hamperOptions.budgets },
    { key: 'theme', label: 'Theme', options: hamperOptions.themes },
  ]

  const [currentStep, setCurrentStep] = useState(0)
  const [builder, setBuilder] = useState({
    occasion: hamperOptions.occasions[0],
    hamperType: hamperOptions.hamperTypes[0],
    budget: hamperOptions.budgets[2],
    theme: hamperOptions.themes[0],
    selectedProducts: [],
  })

  const currentConfig = steps[currentStep]

  const totalValue = useMemo(
    () =>
      builder.selectedProducts.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
    [builder.selectedProducts],
  )

  const addProductToHamper = (product) => {
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
            <div className="mt-4 flex flex-wrap gap-3">
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
            </div>
          </div>

          {currentStep === steps.length - 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#2d1b21]">Select products</h2>
                <button
                  type="button"
                  onClick={() => addToCart({ id: 0, name: builder.hamperType, price: totalValue }, 1)}
                  className="rounded-full border border-[#efdae2] bg-[#fff3f7] px-3 py-2 text-sm font-medium text-[#7f3d52]"
                >
                  Save hamper
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {products.slice(0, 8).map((product) => {
                  const selected = builder.selectedProducts.some((item) => item.id === product.id)
                  return (
                    <div key={product.id} className="rounded-[22px] border border-[#f0dfe5] bg-[#fff] p-3 shadow-sm">
                      <img src={product.image} alt={product.name} className="h-36 w-full rounded-[18px] object-cover" />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-[#7a6470]">{product.category}</div>
                          <div className="mt-1 text-lg font-semibold text-[#2d1b21]">{product.name}</div>
                        </div>
                        <div className="text-base font-semibold text-[#2d1b21]">{formatMoney(product.price)}</div>
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
              onClick={() => setCurrentStep((step) => Math.min(step + 1, steps.length - 1))}
              className="rounded-full bg-[#2f1f25] px-5 py-2.5 text-sm font-medium text-white"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
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
            <div className="flex items-center justify-between text-sm text-[#5d4d53]">
              <span>Theme</span>
              <span className="font-medium text-[#2d1b21]">{builder.theme}</span>
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
                    <div className="text-xs text-[#7a6570]">{formatMoney(item.price)}</div>
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
            <div className="flex items-center justify-between text-sm text-[#ebdfe5]">
              <span>Live hamper total</span>
              <span>{formatMoney(totalValue)}</span>
            </div>
            <div className="mt-4 text-2xl font-bold">{formatMoney(totalValue)}</div>
            <button
              type="button"
              onClick={() => addToCart({ id: 'custom-hamper', name: builder.hamperType, price: totalValue }, 1)}
              className="mt-5 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#2f1f25]"
            >
              Add custom hamper to cart
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
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-₹199</span>
            </div>
          </div>
          <div className="my-5 h-px bg-[#efdfe5]" />
          <div className="flex items-center justify-between text-xl font-bold text-[#2d1b21]">
            <span>Total</span>
            <span>{formatMoney(Math.max(subtotal + 199 - 199, 0))}</span>
          </div>
          <Link to="/checkout" className="mt-6 block rounded-full bg-[#2f1f25] px-5 py-3 text-center text-sm font-medium text-white">
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  )
}

function CheckoutPage({ cart, subtotal }) {
  const total = Math.max(subtotal + 199 - 199, 0)

  const handleSubmit = (event) => {
    event.preventDefault()
    alert('Order placed successfully! We will contact you with tracking details shortly.')
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
            <Field label="Full name" placeholder="Your name" />
            <Field label="Email" type="email" placeholder="you@example.com" />
            <Field label="Phone" placeholder="+91 98765 43210" />
            <Field label="City" placeholder="Bengaluru" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#3c2c32]">Delivery address</label>
            <textarea
              rows="4"
              placeholder="House number, street, locality, landmark"
              className="w-full rounded-[20px] border border-[#efdfe5] bg-[#fffaf7] px-4 py-3 text-sm text-[#2f1f25] outline-none placeholder:text-[#887980]"
            />
          </div>
          <button type="submit" className="rounded-full bg-[#2f1f25] px-6 py-3 text-sm font-medium text-white">
            Place order
          </button>
        </form>

        <aside className="rounded-[28px] border border-[#f1dfe5] bg-[#fff8fa] p-6 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-[#7f3d52]">Order summary</div>
          <div className="mt-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-sm text-[#5c4d52]">Your cart is empty.</div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-[#463b41]">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
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
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-₹199</span>
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

function Field({ label, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#3c2c32]">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
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
          <span className="flex items-center gap-1 font-medium text-[#f29b3a]">
            <Star size={12} fill="currentColor" />
            {product.rating}
          </span>
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

function Footer() {
  return (
    <footer className="mt-20 border-t border-[#f3dfe5] bg-[#fff]">
      <div className="section-shell grid gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f9dfe8] text-[#7f3d52]">
              <Gift size={18} />
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.08em] text-[#2e1d24]">Melt & Muse</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#8a6b73]">Boutique gifting</div>
            </div>
          </div>
          <p className="mt-4 text-[#645761]">Premium gifting curated for birthdays, weddings, anniversaries, and surprise moments.</p>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#2f1f25]">Shop</div>
          <ul className="space-y-3 text-[#645761]">
            <li>Gift hampers</li>
            <li>Bouquets</li>
            <li>Custom gifts</li>
            <li>Corporate gifting</li>
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#2f1f25]">Support</div>
          <ul className="space-y-3 text-[#645761]">
            <li>FAQs</li>
            <li>Track order</li>
            <li>Shipping</li>
            <li>Returns</li>
          </ul>
        </div>
        <div>
          <div className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#2f1f25]">Contact</div>
          <ul className="space-y-3 text-[#645761]">
            <li className="flex items-center gap-2"><Mail size={16} /> hello@meltandmuse.in</li>
            <li className="flex items-center gap-2"><Phone size={16} /> +91 98765 43210</li>
            <li className="flex items-center gap-2"><MapPin size={16} /> Bengaluru, India</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

export default App
