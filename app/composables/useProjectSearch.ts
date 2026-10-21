export const useProjectSearch = () => {
  const searchQuery = useState('projectSearchQuery', () => '')
  return { searchQuery }
}
