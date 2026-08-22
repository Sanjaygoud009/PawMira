export const getSafeImageUrl = (
  url,
  defaultImg = 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800',
  width
) => {
  let targetUrl = url || defaultImg;
  
  if (targetUrl.startsWith('data:')) {
    return targetUrl;
  }

  // Cloudinary optimization: append quality/format auto for bandwidth savings.
  // Feed cards can additionally request a display-appropriate width without
  // changing the stored original asset.
  if (targetUrl.includes('res.cloudinary.com') && !targetUrl.includes('q_auto')) {
    const transformations = width
      ? `w_${width},c_limit,q_auto,f_auto`
      : 'q_auto,f_auto';
    targetUrl = targetUrl.replace('/upload/', `/upload/${transformations}/`);
  }

  return targetUrl;
};
