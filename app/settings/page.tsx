'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { loadGameSettings, saveGameSettings, defaultGameSettings, operatorColors, applyPreset, ExtendedGameSettings } from '@/lib/gameSettings'

export default function Settings() {
  const [settings, setSettings] = useState<ExtendedGameSettings>(defaultGameSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  // Load settings on mount
  useEffect(() => {
    loadGameSettings().then(setSettings)
  }, [])

  // Validate settings
  const validateSettings = (): boolean => {
    const newErrors: string[] = []
    
    // Check if at least one operator is enabled
    const hasEnabledOperator = Object.values(settings.operators).some(op => op.enabled)
    if (!hasEnabledOperator) {
      newErrors.push('At least one operator must be enabled')
    }
    
    // Validate ranges
    Object.entries(settings.operators).forEach(([op, config]) => {
      if (config.minA > config.maxA) {
        newErrors.push(`${op}: Min A cannot be greater than Max A`)
      }
      if (config.minB > config.maxB) {
        newErrors.push(`${op}: Min B cannot be greater than Max B`)
      }
    })
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateSettings()) return
    
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      await saveGameSettings(settings)
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      setErrors(['Failed to save settings'])
    } finally {
      setIsSaving(false)
    }
  }

  // Handle reset
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setSettings(defaultGameSettings)
      setErrors([])
    }
  }

  // Handle preset application
  const handlePreset = (presetName: keyof typeof import('@/lib/gameSettings').presets) => {
    setSettings(applyPreset(settings, presetName))
  }

  // Update operator enabled state
  const toggleOperator = (op: keyof typeof settings.operators) => {
    setSettings(prev => ({
      ...prev,
      operators: {
        ...prev.operators,
        [op]: {
          ...prev.operators[op],
          enabled: !prev.operators[op].enabled
        }
      }
    }))
  }

  // Update operator range
  const updateOperatorRange = (
    op: keyof typeof settings.operators, 
    field: 'minA' | 'maxA' | 'minB' | 'maxB', 
    value: number
  ) => {
    setSettings(prev => ({
      ...prev,
      operators: {
        ...prev.operators,
        [op]: {
          ...prev.operators[op],
          [field]: value
        }
      }
    }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Game Settings</h1>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <ul className="list-disc list-inside">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success message */}
      {saveMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {saveMessage}
        </div>
      )}

      {/* Operators Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Math Operators</h2>
        
        <div className="space-y-6">
          {(Object.keys(settings.operators) as Array<keyof typeof settings.operators>).map(op => {
            const config = settings.operators[op]
            const colors = operatorColors[op]
            const symbol = op === 'addition' ? '+' : op === 'subtraction' ? '-' : op === 'multiplication' ? '×' : '÷'
            
            return (
              <div key={op} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={() => toggleOperator(op)}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-lg font-medium capitalize">{op}</span>
                    <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${config.enabled ? colors.bg : 'bg-gray-400'}`}>
                      {symbol}
                    </span>
                  </label>
                </div>

                {config.enabled && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Number Range
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={op === 'multiplication' || op === 'division' ? 12 : 100}
                          value={config.minA}
                          onChange={(e) => updateOperatorRange(op, 'minA', parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-600">to</span>
                        <input
                          type="number"
                          min={0}
                          max={op === 'multiplication' || op === 'division' ? 12 : 100}
                          value={config.maxA}
                          onChange={(e) => updateOperatorRange(op, 'maxA', parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Second Number Range
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={op === 'multiplication' || op === 'division' ? 12 : 100}
                          value={config.minB}
                          onChange={(e) => updateOperatorRange(op, 'minB', parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-600">to</span>
                        <input
                          type="number"
                          min={0}
                          max={op === 'multiplication' || op === 'division' ? 12 : 100}
                          value={config.maxB}
                          onChange={(e) => updateOperatorRange(op, 'maxB', parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {op === 'subtraction' && (
                      <div className="col-span-2 mt-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={config.allowNegative}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              operators: {
                                ...prev.operators,
                                subtraction: {
                                  ...prev.operators.subtraction,
                                  allowNegative: e.target.checked
                                }
                              }
                            }))}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Allow negative answers</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Game Settings Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Game Options</h2>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Questions per Collision
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.questionsPerCollision}
                onChange={(e) => setSettings(prev => ({ ...prev, questionsPerCollision: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seconds per Question
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={settings.secondsPerQuestion}
                onChange={(e) => setSettings(prev => ({ ...prev, secondsPerQuestion: parseInt(e.target.value) || 15 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bubbles per Minute
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={settings.bubblesPerMinute}
                onChange={(e) => setSettings(prev => ({ ...prev, bubblesPerMinute: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Enable sound effects</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.mobileControls}
                onChange={(e) => setSettings(prev => ({ ...prev, mobileControls: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Show mobile controls</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.failFast}
                onChange={(e) => setSettings(prev => ({ ...prev, failFast: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Fail fast (end quiz on first wrong answer)</span>
            </label>
          </div>
        </div>
      </section>

      {/* Presets Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Quick Presets</h2>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handlePreset('7_table')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              7× Table
            </button>
            <button
              onClick={() => handlePreset('8_table')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              8× Table
            </button>
            <button
              onClick={() => handlePreset('9_table')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              9× Table
            </button>
            <button
              onClick={() => handlePreset('warmup_2_5')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              2-5 Warmup
            </button>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}