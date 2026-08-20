'use client'

import { supabase } from './supabase'

export interface FlowcastUser {
  id?: string
  email: string
  role: 'commuter' | 'planner' | 'admin'
  name: string
  token?: string
}

const STORAGE_KEY = 'flowcast_auth_user'

export function getStoredUser(): FlowcastUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setStoredUser(user: FlowcastUser): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {}
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export async function getCurrentAuthUser(): Promise<FlowcastUser | null> {
  const local = getStoredUser()
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        const role = (data.user.user_metadata?.role || local?.role || 'commuter') as 'commuter' | 'planner' | 'admin'
        const userObj: FlowcastUser = {
          id: data.user.id,
          email: data.user.email || '',
          role,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
        }
        setStoredUser(userObj)
        return userObj
      }
    } catch {}
  }
  return local
}

export async function signOutUser(): Promise<void> {
  clearStoredUser()
  if (supabase) {
    try {
      await supabase.auth.signOut()
    } catch {}
  }
}
