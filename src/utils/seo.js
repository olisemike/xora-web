// SEO and Meta Tag Management Utilities

const updateMetaTag = (attribute, key, content) => {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
};

const updateLinkTag = (rel, href) => {
  let element = document.querySelector(`link[rel="${rel}"]`);
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', href);
};

export const updatePageMeta = ({ title, description, keywords, image, url }) => {
  // Update title
  if (title) {
    document.title = `${title} | Xora Social`;
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('name', 'twitter:title', title);
  }

  // Update description
  if (description) {
    updateMetaTag('name', 'description', description);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('name', 'twitter:description', description);
  }

  // Update keywords
  if (keywords) {
    updateMetaTag('name', 'keywords', keywords);
  }

  // Update image
  if (image) {
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('name', 'twitter:image', image);
  }

  // Update URL
  if (url) {
    updateMetaTag('property', 'og:url', url);
    updateMetaTag('name', 'twitter:url', url);
    updateLinkTag('canonical', url);
  }
};

// Structured Data (JSON-LD) helpers
export const addStructuredData = (data) => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
};

export const generatePostStructuredData = (post) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: post.content?.substring(0, 100),
    image: post.media?.[0]?.url,
    author: {
      '@type': 'Person',
      name: post.user?.name,
      url: `https://xorasocial.com/profile/${post.user?.username}`
    },
    datePublished: post.createdAt,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.likes || 0
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.comments || 0
      }
    ]
  };
};

export const generateProfileStructuredData = (user) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: user.name,
    alternateName: user.username,
    description: user.bio,
    image: user.avatar,
    url: `https://xorasocial.com/profile/${user.username}`,
    sameAs: user.website ? [user.website] : []
  };
};

// Performance monitoring
export const reportWebVitals = (metric) => {
  // Log Core Web Vitals
  const { name, value, rating } = metric;
  if (import.meta.env.DEV) {
    console.info({
      name,
      value: Math.round(value),
      rating
    });
  }

  // Send to analytics (when integrated)
  // analytics.track('web_vital', { name, value, rating });
};

// Image lazy loading helper
export const lazyLoadImage = (img) => {
  if ('loading' in HTMLImageElement.prototype) {
    img.loading = 'lazy';
  } else {
    // Fallback for browsers that don't support lazy loading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const lazyImg = entry.target;
          lazyImg.src = lazyImg.dataset.src;
          observer.unobserve(lazyImg);
        }
      });
    });
    observer.observe(img);
  }
};

// Preload critical resources
export const preloadResource = (href, as, type) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  document.head.appendChild(link);
};

// Service Worker registration (optional)
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      // eslint-disable-next-line no-console
      return registration;
    } catch (error) {
      // eslint-disable-next-line no-console
    }
  }
};



