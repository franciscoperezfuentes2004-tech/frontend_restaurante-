import React from 'react';
import { Star } from 'lucide-react';

export const Estrellas = ({ calificacion = 5, className = "w-4 h-4" }) => {
  const ratingNum = Math.round(Number(calificacion) || 5);
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${className} ${
            star <= ratingNum ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
    </div>
  );
};

export default function ReviewCard({ resena = {} }) {
  const rating = resena.rating || resena.calificacion || 5;
  const clienteNombre = resena.cliente_nombre || resena.nombre || resena.customer_name || 'Comensal';
  const comentario = resena.comentario || resena.comment || '';
  const respuestaAdmin = resena.respuesta_admin || resena.response || resena.reply || resena.reply_text;

  return (
    <div className="comentario-cliente bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
      <Estrellas calificacion={rating} />
      <h3 className="font-bold text-gray-900 dark:text-slate-100 mt-2">{clienteNombre}</h3>
      <p className="text-gray-600 dark:text-slate-300 italic">"{comentario}"</p>

      {/* SI EL ADMIN RESPONDIÓ, SE MUESTRA ESTE BLOQUE CONECTADO */}
      {respuestaAdmin && (
        <div className="mt-4 bg-slate-50 dark:bg-slate-800/60 border-l-4 border-blue-600 p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Respuesta del local</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {respuestaAdmin}
          </p>
        </div>
      )}
    </div>
  );
}
