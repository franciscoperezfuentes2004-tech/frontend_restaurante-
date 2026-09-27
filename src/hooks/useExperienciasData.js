import { useState, useEffect } from 'react';
import axios from 'axios';
import client from '../api/client';

const useExperienciasData = () => {
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let response;
        try {
          response = await client.get('/statistics/experiences');
        } catch {
          response = await axios.get('/api/statistics/experiences');
        }
        if (isMounted) {
          setStatistics(response.data);
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

  return { statistics, isLoading, error };
};

export default useExperienciasData;
