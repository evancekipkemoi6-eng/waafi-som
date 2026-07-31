import { useParams } from 'react-router-dom';

export const useUserId = () => {
  const { userId } = useParams();
  const isValid = userId && /^[a-z]{2}$/.test(userId);
  const userIndex = isValid ? (userId.charCodeAt(0) - 97) * 26 + (userId.charCodeAt(1) - 97) + 1 : null;
  const apiBase = isValid ? `/api/${userId}` : null;
  return { userId, userIndex, apiBase, isValid };
};
