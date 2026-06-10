import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_META = {
  '/': {
    title: 'PawMira — Animal Emergency Response Platform',
    description: 'Report injured animals in under 30 seconds. Connect with nearby rescue volunteers and NGOs instantly. Every paw deserves a miracle.',
  },
  '/feed': {
    title: 'Live Rescue Feed — PawMira',
    description: 'Real-time animal emergency reports near you. See active rescues, respond to emergencies, and track rescue progress.',
  },
  '/report': {
    title: 'Report Emergency — PawMira',
    description: 'Report an injured animal quickly. Upload a photo, share location, and connect with nearby rescue volunteers.',
  },
  '/lost-found': {
    title: 'Lost & Found Pets — PawMira',
    description: 'Report lost pets or found strays. Help reunite pets with their families through community-powered matching.',
  },
  '/heroes': {
    title: 'Community Heroes — PawMira',
    description: 'Meet the top rescue heroes in your community. See leaderboards, achievements, and the impact of animal rescuers.',
  },
  '/dashboard': {
    title: 'Dashboard — PawMira',
    description: 'Manage your rescue reports, track your hero profile, and view achievements.',
  },
  '/login': {
    title: 'Sign In — PawMira',
    description: 'Sign in to your PawMira account to manage rescues and track your impact.',
  },
  '/register': {
    title: 'Join PawMira — Create Account',
    description: 'Sign up as a volunteer or NGO partner to help rescue animals in your community.',
  },
  '/about': {
    title: 'About Us — PawMira',
    description: 'Learn about PawMira\'s mission to create an instant bridge between distressed animals and rescue teams.',
  },
  '/services': {
    title: 'Our Services — PawMira',
    description: 'Emergency rescue, medical treatment, shelter, vaccination, transport, and post-rescue follow-up services.',
  },
  '/contact': {
    title: 'Contact Us — PawMira',
    description: 'Get in touch with the PawMira team. We\'d love to hear from you.',
  },
  '/volunteer': {
    title: 'Become a Volunteer — PawMira',
    description: 'Join our growing family of volunteers and make a real difference in the lives of animals.',
  },
  '/adoption': {
    title: 'Adopt a Pet — PawMira',
    description: 'Give a rescued animal a loving forever home. Browse available dogs and start the adoption process.',
  },
  '/gallery': {
    title: 'Gallery — PawMira',
    description: 'Stories of hope, resilience, and love. Browse our collection of rescue moments.',
  },
};

export default function usePageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = PAGE_META[pathname] || {
      title: 'PawMira — Animal Emergency Response',
      description: 'Report injured animals and connect with rescue volunteers.',
    };

    document.title = meta.title;

    // Update meta description
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.description);

    // Update OG tags
    const ogTags = {
      'og:title': meta.title,
      'og:description': meta.description,
      'og:type': 'website',
      'og:site_name': 'PawMira',
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });
  }, [pathname]);
}
