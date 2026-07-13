import { useNavigate } from 'react-router-dom'
import { Heart, ArrowRight, Shield, MessageCircle, Users } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-600 via-rose-500 to-purple-700">
      
      {/* 🚀 Dynamic SEO Injector */}
      <Helmet>
        <title>FindLove - Find Your Perfect Match Online | Dating App</title>
        <meta name="description" content="Join FindLove to meet new people, discover genuine matches, and chat in real-time. Experience a safe, secure, and modern dating application today." />
        <link rel="canonical" href="https://yourdomain.com" />
      </Helmet>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-5">
        {/* FIXED: Changed from h1 to div to ensure strictly ONE h1 on the entire page */}
        <div className="flex items-center gap-2">
          <Heart className="w-8 h-8 text-white fill-white" />
          <span className="text-3xl font-bold text-white tracking-tight">
            FindLove
          </span>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 text-white border border-white rounded-full hover:bg-white hover:text-pink-600 transition"
          >
            Login
          </button>

          <button
            onClick={() => navigate('/signup')}
            className="px-6 py-2 bg-white text-pink-600 rounded-full font-semibold hover:scale-105 transition"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/20 max-w-4xl">
          
          {/* ✅ ONLY MAIN H1 TAG FOR THE PAGE */}
          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Find Your Perfect Match Online ❤️
          </h1>

          <p className="text-xl text-pink-100 mb-8 max-w-2xl mx-auto">
            Join thousands of singles on FindLove and discover meaningful
            relationships, genuine connections, and your soulmate.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-white text-pink-600 rounded-full font-bold text-lg flex items-center gap-2 justify-center hover:scale-105 transition"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white hover:text-pink-600 transition"
            >
              Login
            </button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
            <Users className="w-12 h-12 mx-auto text-white mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Meet New People
            </h2>
            <p className="text-pink-100">
              Discover amazing people near you and make meaningful connections.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
            <MessageCircle className="w-12 h-12 mx-auto text-white mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Real-Time Chat
            </h2>
            <p className="text-pink-100">
              Chat instantly with matches and build strong relationships.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
            <Shield className="w-12 h-12 mx-auto text-white mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Safe & Secure
            </h2>
            <p className="text-pink-100">
              Verified profiles and secure messaging for a trusted experience.
            </p>
          </div>

        </div>
      </section>
    </div>
  )
}