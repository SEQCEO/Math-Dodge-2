'use client'

import Link from 'next/link'
import { Gamepad2, Brain, Settings, Keyboard, Calculator, Wifi } from 'lucide-react'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          Dodge. Think. Win.
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Navigate through falling math problems while solving equations. 
          Test your reflexes and mathematical skills in this thrilling educational game.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/play"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Gamepad2 className="w-5 h-5" />
            Play Game
          </Link>
          
          <Link
            href="/practice"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            <Brain className="w-5 h-5" />
            Practice Mode
          </Link>
          
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </section>

      {/* Info Cards */}
      <section className="grid md:grid-cols-3 gap-6">
        {/* Keyboard Controls Card */}
        <article className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Keyboard className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Keyboard Controls</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Use arrow keys or WASD to move your character and dodge falling numbers.
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• ↑/W - Move Up</li>
            <li>• ↓/S - Move Down</li>
            <li>• ←/A - Move Left</li>
            <li>• →/D - Move Right</li>
            <li>• ESC - Pause Game</li>
          </ul>
        </article>

        {/* Quiz Info Card */}
        <article className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calculator className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Quiz System</h2>
          </div>
          <p className="text-gray-600 mb-4">
            When you collide with a number, solve the math problem quickly to continue!
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Multiple choice answers</li>
            <li>• Time-limited questions</li>
            <li>• Practice specific operators</li>
            <li>• Track your progress</li>
            <li>• Customizable difficulty</li>
          </ul>
        </article>

        {/* Local Only Card */}
        <article className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Wifi className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Play Offline</h2>
          </div>
          <p className="text-gray-600 mb-4">
            All game data is stored locally on your device. No internet connection required!
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Settings saved locally</li>
            <li>• High scores preserved</li>
            <li>• No account needed</li>
            <li>• Privacy focused</li>
            <li>• Play anywhere</li>
          </ul>
        </article>
      </section>
    </div>
  )
}