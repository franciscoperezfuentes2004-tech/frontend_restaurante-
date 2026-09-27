import { useState, useEffect } from 'react';
import axios from 'axios';
import client from '../api/client';

const useResenas = () => {
  const [reviewsData, setReviewsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let response;
        try {
          response = await client.get('/reviews/landing');
        } catch {
          response = await axios.get('/api/reviews/landing');
        }
        if (isMounted) {
          setReviewsData(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { reviewsData, isLoading, error };
};

export default useResenas;
