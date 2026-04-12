import { Search } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;
    isSearching?: boolean;
}

const SearchBar = ({ value, onChange, onSearch, isSearching = false, placeholder = 'Search prompts by title, category, platform...' }: SearchBarProps) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onSearch && value.trim()) {
            onSearch(value.trim());
        }
    };

    return (
        <div className="search-bar-large">
            <Search size={20} className="search-bar-icon" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="search-bar-input"
            />
            {isSearching && (
                <div className="search-loading-indicator" style={{
                    width: 18, height: 18,
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderTopColor: 'var(--accent-neon)',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                    marginRight: 8,
                }} />
            )}
            {value && (
                <button className="search-clear" onClick={() => { onChange(''); onSearch?.(''); }}>
                    Clear
                </button>
            )}
        </div>
    );
};

export default SearchBar;
