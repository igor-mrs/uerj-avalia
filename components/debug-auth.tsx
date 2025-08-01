"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function DebugAuth() {
  const [status, setStatus] = useState('')

  const testLogin = async () => {
    try {
      setStatus('Testando login direto...')
      
      // Simular sessão manual (apenas para teste)
      const { data: session } = await supabase.auth.getSession()
      console.log('📊 Sessão atual:', session)
      
      // Verificar localStorage
      const keys = Object.keys(localStorage).filter(key => key.includes('supabase'))
      console.log('🔑 Chaves localStorage:', keys)
      
      // Mostrar dados do localStorage
      keys.forEach(key => {
        console.log(`${key}:`, localStorage.getItem(key))
      })
      
      setStatus(`Sessão: ${session?.session ? 'Ativa' : 'Inativa'}`)
      
    } catch (error) {
      console.error('❌ Erro:', error)
      setStatus('Erro: ' + error)
    }
  }

  const clearSession = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.clear()
      setStatus('Sessão limpa')
      window.location.reload()
    } catch (error) {
      console.error('❌ Erro ao limpar:', error)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
      <h3 className="font-bold mb-2">Debug Auth</h3>
      <div className="space-y-2">
        <button 
          onClick={testLogin}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm block w-full"
        >
          Verificar Sessão
        </button>
        <button 
          onClick={clearSession}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm block w-full"
        >
          Limpar Sessão
        </button>
        {status && (
          <div className="text-xs mt-2 p-2 bg-gray-100 rounded">
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
