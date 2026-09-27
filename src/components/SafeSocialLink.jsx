import React from 'react';

/**
 * Componente de Enlace Seguro para redes sociales.
 * Valida la URL con expresiones regulares estrictas y fuerza atributos de seguridad (noopener, noreferrer).
 */
export const SafeSocialLink = ({ url, network, className, children, ...props }) => {
  // 1. Validar estrictamente el formato de la URL
  // Solo permite "https://www.facebook.com/usuario" o similares. Bloquea "http" o "javascript:"
  const dominiosPermitidos = {
    facebook: /^https:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9_.-]+(\/?.*)?$/i,
    instagram: /^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.-]+(\/?.*)?$/i,
    tiktok: /^https:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.-]+(\/?.*)?$/i,
  };

  const normalizedNetwork = String(network || '').toLowerCase();
  const cleanUrl = typeof url === 'string' ? url.trim() : '';
  const isSafe = dominiosPermitidos[normalizedNetwork]?.test(cleanUrl);

  // Si la URL falla la prueba de seguridad, renderiza un div inofensivo en lugar de un enlace
  if (!isSafe) {
    console.warn(`URL sospechosa bloqueada en red social: ${network}`, url);
    return (
      <div 
        className={`cursor-not-allowed opacity-50 ${className || ''}`}
        title="Enlace no disponible o no seguro"
      >
        {children}
      </div>
    );
  }

  return (
    <a 
      href={cleanUrl} 
      target="_blank" 
      // 2. PROTECCIÓN CRÍTICA: rel="noopener noreferrer" evita que la nueva pestaña secuestre la pestaña original
      rel="noopener noreferrer" 
      className={className || "flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"}
      {...props}
    >
      {children}
    </a>
  );
};

export default SafeSocialLink;
