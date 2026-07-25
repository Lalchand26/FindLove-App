import { useNavigate, Link } from 'react-router-dom'
import { Heart, ArrowRight, Shield, MessageCircle, Users } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-pink-600 via-rose-500 to-purple-700 flex flex-col justify-between">
      
      {/* 🚀 Dynamic SEO Injector */}
      <Helmet>
        <title>CityCrossed - Find Your Perfect Match Online | Dating App</title>
        <meta name="description" content="Join CityCrossed to meet new people, discover genuine matches, and chat in real-time. Experience a safe, secure, and modern dating application today." />
        <link rel="canonical" href="https://citycrossed.com" />
      </Helmet>

      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

      <div>
        {/* Navbar */}
        <nav className="relative z-10 flex justify-between items-center px-8 py-5">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-white fill-white" />
            <span className="text-3xl font-bold text-white tracking-tight">
              CityCrossed
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
        <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="bg-white/10 backdrop-blur-md p-10 rounded-3xl border border-white/20 max-w-4xl">
            
            <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Find Your Perfect Match Online ❤️
            </h1>

            <p className="text-xl text-pink-100 mb-8 max-w-2xl mx-auto">
              Join thousands of singles on CityCrossed and discover meaningful
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
        <section className="relative z-10 max-w-6xl mx-auto px-6 pb-12">
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

      {/* 📄 FOOTER SECTION */}
      <footer className="relative z-10 border-t border-white/20 bg-black/20 backdrop-blur-md py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          
          <p className="text-pink-100 text-sm">
            © {new Date().getFullYear()} CityCrossed. All rights reserved.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-pink-100">
            <Link to="/faq" className="hover:text-white transition underline-offset-4 hover:underline">
              FAQ
            </Link>
            <Link to="/safety" className="hover:text-white transition underline-offset-4 hover:underline">
              Safety
            </Link>
            <Link to="/support" className="hover:text-white transition underline-offset-4 hover:underline">
              Support
            </Link>
            <Link to="/privacy" className="hover:text-white transition underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white transition underline-offset-4 hover:underline">
              Terms of Service
            </Link>
          </div>

        </div>
      </footer>

    </div>
  )
}