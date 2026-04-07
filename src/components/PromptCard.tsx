import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import type { Prompt } from '../types/Prompt';

interface PromptCardProps {
    prompt: Prompt;
}



const PromptCard = ({ prompt }: PromptCardProps) => {
    const { user } = useAuth();
    const [isFav, setIsFav] = useState(false);

    useEffect(() => {
        if (!user) return;
        const checkFav = async () => {
            const favRef = doc(db, 'users', user.uid, 'favorites', prompt.id);
            const snap = await getDoc(favRef);
            setIsFav(snap.exists());
        };
        checkFav();
    }, [user, prompt.id]);

    const toggleFav = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        const favRef = doc(db, 'users', user.uid, 'favorites', prompt.id);
        if (isFav) {
            await deleteDoc(favRef);
            setIsFav(false);
        } else {
            await setDoc(favRef, { savedAt: new Date() });
            setIsFav(true);
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
