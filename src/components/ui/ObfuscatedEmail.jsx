import React from 'react';

/**
 * Componente de Correo Ofuscado contra Web Scraping y Bots de Spam.
 * Descompone la dirección en usuario y dominio en tiempo de ejecución de React.
 */
export const ObfuscatedEmail = ({ email = 'contacto@restaurante.com', className = '' }) => {
  const clean = String(email || 'contacto@restaurante.com').trim();
  const parts = clean.split('@');
  const user = parts[0] || 'contacto';
  const domain = parts.slice(1).join('@') || 'restaurante.com';

  return (
    <a 
      // El enlace mailto se construye solo cuando React renderiza, burlando a los bots estáticos
      href={'mailto:' + user + '@' + domain} 
      className={className || 'text-theme-text text-sm hover:text-[var(--theme-primary)] transition-colors font-normal'}
    >
      {user}@{domain}
    </a>
  );
};

export default ObfuscatedEmail;