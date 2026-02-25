import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Users, Loader2 } from 'lucide-react';

interface Character {
  id: number;
  name: string;
  status: string;
  species: string;
  type: string;
  gender: string;
  origin: any;
  location: any;
  image: string;
  episode: string[];
  url: string;
  created: string;
}

interface ApiResponse {
  results: Character[];
}

const usefetchCharacters = (searchTerm: string) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(
    async (name: string) => {
      if (!name.trim()) {
        setCharacters([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://rickandmortyapi.com/api/character/?name=${encodeURIComponent(
            name
          )}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }
        const data = await response.json();
        setCharacters(data.results);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCharacters(searchTerm);
  }, [searchTerm, fetchCharacters]);

  return { characters, error, loading };
};

export const RickAndMorty = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    species: '',
    gender: '',
  });
  
  const { characters, error, loading } = usefetchCharacters(searchTerm);

  const filteredCharacters = useMemo(() => {
    let filtered = characters;

    if (filters.status) {
      filtered = filtered.filter((char) => char.status === filters.status);
    }

    if (filters.species) {
      filtered = filtered.filter((char) => char.species === filters.species);
    }

    if (filters.gender) {
      filtered = filtered.filter((char) => char.gender === filters.gender);
    }
    return filtered;
  }, [characters, filters]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, status: e.target.value }));
  }, []);

  const handleSpeciesChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, species: e.target.value }));
  }, []);

  const handleGenderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, gender: e.target.value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: '',
      species: '',
      gender: '',
    });
  }, []);

  return (
    <div className="app-container">
      <div className="content-wrapper">
        {/* Header */}
        <div className="header">
          <h1 className="header-title">
            <Users className="header-icon" />
            Rick and Morty Character Search
          </h1>
          <p className="header-subtitle">
            Search and filter characters from the multiverse
          </p>
        </div>

        <div className="search-wrapper">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search for a character..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
        </div>

        <div className="main-layout">
          <aside className="sidebar">
            <div className="sidebar-content">
              <div className="sidebar-header">
                <h3 className="sidebar-title">Filters</h3>
                {(filters.status || filters.species || filters.gender) && (
                  <button onClick={clearFilters} className="clear-button">
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <select
                  value={filters.status}
                  onChange={handleStatusChange}
                  className="filter-select"
                >
                  <option value="">All</option>
                  <option value="Alive">Alive</option>
                  <option value="Dead">Dead</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              {/* Species Filter */}
              <div className="filter-group">
                <label className="filter-label">Species</label>
                <select
                  value={filters.species}
                  onChange={handleSpeciesChange}
                  className="filter-select"
                >
                  <option value="">All</option>
                  <option value="Human">Human</option>
                  <option value="Alien">Alien</option>
                  <option value="Humanoid">Humanoid</option>
                  <option value="Robot">Robot</option>
                  <option value="Cronenberg">Cronenberg</option>
                  <option value="Animal">Animal</option>
                </select>
              </div>

              {/* Gender Filter */}
              <div className="filter-group">
                <label className="filter-label">Gender</label>
                <select
                  value={filters.gender}
                  onChange={handleGenderChange}
                  className="filter-select"
                >
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Genderless">Genderless</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              {/* Results Count */}
              {searchTerm && !loading && (
                <div className="results-count">
                  <p className="results-count-text">
                    Showing{' '}
                    <span className="results-count-number">
                      {filteredCharacters.length}
                    </span>{' '}
                    of{' '}
                    <span className="results-count-total">
                      {characters.length}
                    </span>{' '}
                    results
                  </p>
                </div>
              )}
            </div>
          </aside>

          {/* Results Section */}
          <main className="main-content">
            <div className="results-container">
              <h2 className="results-title">Search Results</h2>
              {/* Loading State */}
              {loading && (
                <div className="loading-container">
                  <Loader2 className="loading-spinner" />
                  <p className="loading-text">Loading characters...</p>
                </div>
              )}
              {error && (
                <div className="error-container">
                  <p className="error-text">{error}</p>
                </div>
              )}
              {/* Empty State - No Search */}
              {!searchTerm && !loading && (
                <div className="empty-state">
                  <Search className="empty-state-icon" />
                  <p className="empty-state-title">
                    Start typing to search for characters
                  </p>
                  <p className="empty-state-subtitle">
                    Try searching for "Rick", "Morty", or "Summer"
                  </p>
                </div>
              )}
              {/* Empty State - No Results */}
              {searchTerm &&
                !loading &&
                filteredCharacters.length === 0 &&
                !error && (
                  <div className="empty-state">
                    <Users className="empty-state-icon" />
                    <p className="empty-state-title">No characters found</p>
                    <p className="empty-state-subtitle">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              {/* Character Grid */}{' '}
              {!loading && filteredCharacters.length > 0 && (
                <div className="character-grid">
                  {filteredCharacters.map((character) => (
                    <div key={character.id} className="character-card">
                      <img
                        src={character.image}
                        alt={character.name}
                        className="character-image"
                      />
                      <div className="character-info">
                        <h3 className="character-name">{character.name}</h3>
                        <div className="character-details">
                          <p className="character-status">
                            <span
                              className={`status-indicator ${
                                character.status === 'Alive'
                                  ? 'status-alive'
                                  : character.status === 'Dead'
                                  ? 'status-dead'
                                  : 'status-unknown'
                              }`}
                            />
                            <span className="status-text">
                              {character.status} - {character.species}
                            </span>
                          </p>
                          <p className="character-detail">
                            <span className="detail-label">Gender:</span>{' '}
                            {character.gender}
                          </p>
                          <p className="character-detail">
                            <span className="detail-label">Location:</span>{' '}
                            {character.location.name}
                          </p>
                          <p className="character-detail">
                            <span className="detail-label">Origin:</span>{' '}
                            {character.origin.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
