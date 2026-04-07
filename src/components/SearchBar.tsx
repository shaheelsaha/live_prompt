import { Search } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder = 'Search prompts by title, category, platform...' }: SearchBarProps) => {
    return (
        <div className="search-bar-large">
            <Search size={20} className="search-bar-icon" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="search-bar-input"
            />
            {value && (
                <button className="search-clear" onClick={() => onChange('')}>
                    Clear
                </button>
            )}
        </div>
    );
};

export default SearchBar;
