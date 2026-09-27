import client from './client'

// Legacy / Testimonial public endpoints
export const getReviews = (params) => client.get('/testimonials', { params })
export const getListadoExperiencias = (params) => client.get('/listado-experiencias', { params })
export const getReviewStats = () => client.get('/reviews/stats')
export const getTestimonialStats = () => client.get('/testimonials/stats')
export const getGalleryImages = (params) => client.get('/testimonials/gallery', { params })
export const getGaleriaDestacada = () => client.get('/galeria-destacada')
export const getResenasDestacadas = () => client.get('/resenas-destacadas')
export const getEstadisticasResenas = () => client.get('/estadisticas-resenas')
export const submitReview = (data) => client.post('/testimonials', data, { headers: { 'Content-Type': 'multipart/form-data' } })
export const voteUseful = (id) => client.post(`/testimonials/${id}/useful`)

// Admin Reviews Endpoints
export const adminGetReviews = (params) => client.get('/admin/reviews', { params })
export const adminGetReviewDetail = (id) => client.get(`/admin/reviews/${id}`)
export const adminRespondReview = (id, data) => client.post(`/admin/reviews/${id}/respond`, data)
export const adminReportReview = (id) => client.patch(`/admin/reviews/${id}/report`)
export const adminDeleteReview = (id) => client.delete(`/admin/reviews/${id}`)

// Public Review Endpoint
export const submitPublicReview = (data) => {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return client.post('/reviews', data, { headers: { 'Content-Type': 'multipart/form-data' } })
  }
  return client.post('/reviews', data)
}

// Legacy Admin Endpoints (backwards compatibility)
export const adminModerateImage = (testimonialId, imageId, data) => client.patch(`/admin/testimonials/${testimonialId}/images/${imageId}`, data)
export const adminReplyReview = (id, data) => client.post(`/admin/testimonials/${id}/reply`, data)
export const adminUpdateReviewStatus = (id, data) => client.patch(`/admin/testimonials/${id}/status`, data)
