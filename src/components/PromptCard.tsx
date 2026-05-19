import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import type { Prompt } from '../types/Prompt';

interface PromptCardProps {
    prompt: Prompt;
    /** Pre-loaded set of favorite prompt IDs — eliminates per-card Firestore reads */
    favoritesSet?: Set<string>;
    /** Callback to update the parent's favorites set after toggle */
    onFavToggle?: (updater: (prev: Set<string>) => Set<string>) => void;
}



const PromptCard = ({ prompt, favoritesSet, onFavToggle }: PromptCardProps) => {
    const { user } = useAuth();
    
    // If favoritesSet is provided (batch mode), use it; otherwise fall back to per-card check
    const isBatchMode = favoritesSet !== undefined;
    const [localFav, setLocalFav] = useState(false);

    // Fallback: per-card check when no batch set is provided (used by SearchPage, DashboardPage, etc.)
    useEffect(() => {
        if (isBatchMode || !user) return;
        const checkFav = async () => {
            const favRef = doc(db, 'users', user.uid, 'favorites', prompt.id);
            const snap = await getDoc(favRef);
            setLocalFav(snap.exists());
        };
        checkFav();
    }, [user, prompt.id, isBatchMode]);

    const isFav = isBatchMode ? (favoritesSet?.has(prompt.id) ?? false) : localFav;

    const toggleFav = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        const favRef = doc(db, 'users', user.uid, 'favorites', prompt.id);
        if (isFav) {
            // Optimistic UI update
            if (isBatchMode) {
                onFavToggle?.(prev => {
                    const next = new Set(prev);
                    next.delete(prompt.id);
                    return next;
                });
            } else {
                setLocalFav(false);
            }
            await deleteDoc(favRef);
        } else {
            // Optimistic UI update
            if (isBatchMode) {
                onFavToggle?.(prev => {
                    const next = new Set(prev);
                    next.add(prompt.id);
                    return next;
                });
            } else {
                setLocalFav(true);
            }
            await setDoc(favRef, { savedAt: new Date() });
        }
    };

    // Helper to safely get the first media url whether the field is a string or an array of strings
    const getFirstMedia = (mediaField: any): string | undefined => {
        if (!mediaField) return undefined;
        if (Array.isArray(mediaField)) return mediaField.length > 0 ? mediaField[0] : undefined;
        return typeof mediaField === 'string' ? mediaField : undefined;
    };

    const firstOutputMedia = getFirstMedia(prompt.outputMediaThumb) || getFirstMedia(prompt.outputMedia);
    const firstAfterImage = getFirstMedia(prompt.afterImageThumb) || getFirstMedia(prompt.afterImage);
    const firstBeforeImage = getFirstMedia(prompt.beforeImageThumb) || getFirstMedia(prompt.beforeImage);

    // Determine what thumbnail to show
    const singleImage = firstAfterImage || firstOutputMedia || firstBeforeImage;
    const isVideo = prompt.promptType === 'video' || prompt.outputMediaType === 'video';

    return (
        <Link to={`/prompt/${prompt.slug || prompt.id}`} className="card card-gallery" style={{ textDecoration: 'none', color: 'inherit', backgroundColor: 'var(--bg-card)' }}>
            {/* Favorite Button */}
            {user && (
                <button className={`fav-btn ${isFav ? 'active' : ''}`} onClick={toggleFav} title={isFav ? 'Remove from favorites' : 'Save to favorites'}>
                    <Heart size={18} fill={isFav ? '#ef4444' : 'none'} />
                </button>
            )}

            {/* Full Image */}
            {isVideo && firstOutputMedia ? (
                <video src={firstOutputMedia} muted playsInline preload="metadata"
                    className="card-gallery-media"
                    onMouseOver={e => (e.target as HTMLVideoElement).play()}
                    onMouseOut={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                />
            ) : singleImage ? (
                <img src={singleImage} alt={prompt.title} className="card-gallery-media" loading="lazy" />
            ) : null}

            {/* Hover overlay — title only */}
            <div className="card-gallery-overlay">
                <h3 className="card-gallery-title">{prompt.title}</h3>
            </div>
        </Link>
    );
};

export { type Prompt };
export default PromptCard;
