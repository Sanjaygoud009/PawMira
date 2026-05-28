export const getSafeImageUrl = (url, defaultImg = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800') => {
  let targetUrl = url || defaultImg;
  
  if (targetUrl.startsWith('data:')) {
    return targetUrl;
  }

  // Cloudinary optimization: append quality/format auto for bandwidth savings
  if (targetUrl.includes('res.cloudinary.com') && !targetUrl.includes('q_auto')) {
    targetUrl = targetUrl.replace('/upload/', '/upload/q_auto,f_auto/');
  }

  return targetUrl;
};
