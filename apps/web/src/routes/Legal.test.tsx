import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Legal from './Legal'

describe('Legal component', () => {
  it('renders Aviso Legal by default and can switch between tabs', () => {
    render(
      <MemoryRouter initialEntries={['/legal/aviso-legal']}>
        <Routes>
          <Route path="/legal" element={<Legal />} />
          <Route path="/legal/:slug" element={<Legal />} />
        </Routes>
      </MemoryRouter>
    )

    // Mock scrollTo
    window.scrollTo = vi.fn()

    // Heading and title
    expect(screen.getByText(/Información Legal y Regulatoria/i)).toBeInTheDocument()
    expect(screen.getByText(/Aviso Legal y Condiciones de Identificación/i)).toBeInTheDocument()
    expect(screen.getAllByText(/LA GRIETA DIGITAL MEDIA & SYSTEMS/i)[0]).toBeInTheDocument()

    // Switch to Privacidad
    const privTab = screen.getByRole('button', { name: /^privacidad$/i })
    fireEvent.click(privTab)
    expect(screen.getByText(/Política de Privacidad y Tratamiento de Datos/i)).toBeInTheDocument()

    // Switch to Términos
    const termTab = screen.getByRole('button', { name: /^términos$/i })
    fireEvent.click(termTab)
    expect(screen.getByText(/Términos y Condiciones de Uso del Servicio M2P/i)).toBeInTheDocument()
    expect(screen.getByText(/Régimen Jurídico de los Créditos B1T\$/i)).toBeInTheDocument()

    // Switch to Cookies
    const cookTab = screen.getByRole('button', { name: /^cookies$/i })
    fireEvent.click(cookTab)
    expect(screen.getByText(/Política de Cookies y Almacenamiento Local/i)).toBeInTheDocument()
    expect(screen.getAllByText(/lagrieta_consent/i)[0]).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restablecer ajustes de cookies/i })).toBeInTheDocument()
  })
})
