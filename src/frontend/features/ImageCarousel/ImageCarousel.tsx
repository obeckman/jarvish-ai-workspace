import React, { useState, useEffect, useRef, useMemo } from 'react';


interface ImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
}

//const imageCache = new Map<string, HTMLImageElement>()

const useLeastRecentlyUsedCache = (limit: number = 10) => {
    // we use the map get, set, has are O(1), and it keep order of insert 
    // we can change implemention to
    //const imageCache = new Map<string, HTMLImageElement>();
    // We declare this OUTSIDE the hook. 
    // This ensures the cache survives even if the component unmounts.and to serve  multiple components with same cache ...
    // my why is per component we get private cache
    const imageCacheRef = useRef(new Map<string, HTMLImageElement>())
    const limitRef = useRef(limit)

    useEffect(() => {
        // avoid memory leaks 
        return () => imageCacheRef.current?.clear()
    }, [])

    useEffect(() => { limitRef.current = limit }, [limit])

    const get = React.useCallback((key: string) => {
        if (!imageCacheRef.current) {
            console.error('get: ref was not created yet')
            return
        }
        const value = imageCacheRef.current.get(key)
        if (!value) return value

        // Accessing an item makes it "Most Recently Used". We must move it to the end of the Map.
        imageCacheRef.current.delete(key)
        imageCacheRef.current.set(key, value)
        return value
    }, [])

    const set = React.useCallback((key: string, value: HTMLImageElement) => {
        if (!imageCacheRef.current) {
            console.error('set: ref was not created yet')
            return
        }

        if (imageCacheRef.current.has(key)) {
            imageCacheRef.current.delete(key)
        }
        else {
            if (imageCacheRef.current.size >= limitRef.current) {
                //Map.keys().next().value is the very first key inserted (the oldest).
                const oldestKey = imageCacheRef.current.keys().next().value
                if (oldestKey) {
                    imageCacheRef.current.delete(oldestKey) //GC can now reclaim this RAM.
                }
            }
        }
        imageCacheRef.current.set(key, value)
    }, [])

    const has = React.useCallback((key: string) => {
        if (!imageCacheRef.current) {
            console.error('has: ref was not created yet')
            return
        }
        return imageCacheRef.current.has(key)
    }, [])

    const preloadImage = (src: string): Promise<void> => {
        // we use the Cache for this main reasons :
        // 1) prevent unnecessary network calls
        // 2) preFetch and preDecode our images for better UX
        // our Cache main Job is to store the image and prevent the browser from cleaning the decode image
        // his second job is to not bloat browser memory , by using limit and Least Recently Used Cache


        if (has(src)) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;


            // This prevents the UI from freezing when a large image is inserted into the DOM.
            // the freeze is due to the unzip, that might take to long on the main thread 
            // the decode , is unziping the image ,not on the main thread, 
            // then we store the data in the cache to keep a reference to the decoded data
            // we do it to prevent the browser from GC it 
            img.decode()
                .then(() => {
                    set(src, img);
                    resolve();
                })
                .catch((err) => {
                    // Handle decoding errors (e.g., corrupt image data)
                    console.error(`Failed to decode image: ${src}`, err);
                    reject(err);
                });
        });
    };


    return { preloadImage }
}

export const HighPerfCarousel: React.FC<{ images: ImageProps[] }> = ({ images }) => {
    const { preloadImage } = useLeastRecentlyUsedCache(15)
    const [currentIndex, setCurrentIndex] = useState(0);

    const activeImage = images[currentIndex];

    const nextIndex = (currentIndex + 1) % images.length; // Carousel index
    const nextImage = images[nextIndex] ?? activeImage;

    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    const prevImage = images[prevIndex] ?? activeImage;

    // -------------------------------------------------------------------------
    // CONCEPT: Pre-fetching (Predictive Loading)
    // We trigger the network request and decoding for the NEXT image 
    // while the user is viewing the CURRENT image.
    // -------------------------------------------------------------------------
    useEffect(() => {
        if (!nextImage || !prevImage) return;

        preloadImage(nextImage.src);
        preloadImage(prevImage.src);
    }, [nextImage, prevImage, preloadImage]);

    if (!activeImage || images.length === 0) {
        return null;
    }

    const handleNext = () => {
        setCurrentIndex(nextIndex);
    };

    const handlePrev = () => {
        setCurrentIndex(prevIndex);
    };

    return (
        <div style={styles.container}>
            {/* CONCEPT: Layout Stability 
        We use a fixed container size or aspect-ratio box.
        This ensures that when the image loads, the buttons/footer don't jump.
      */}
            <div style={styles.stage}>
                <SafeImage
                    src={activeImage.src}
                    alt={`Slide ${currentIndex}`}
                    // Passing dimensions is crucial for the browser to allocate layout space immediately
                    width={activeImage.width}
                    height={activeImage.height}
                />
            </div>

            <div style={styles.controls}>
                <button onClick={handlePrev}>Previous</button>
                <span>{currentIndex + 1} / {images.length}</span>
                <button onClick={handleNext}>Next</button>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// SUB-COMPONENT: SafeImage
// Wraps the native img tag to handle hydration and display
// ---------------------------------------------------------------------------
const SafeImage: React.FC<ImageProps> = ({ src, alt, width, height }) => {
    // We use key={src} to force React to unmount the old img and mount the new one.
    // This ensures the fade-in animation plays every time the source changes.
    return (
        <div
            style={{
                aspectRatio: `${width} / ${height}`, // CSS Aspect Ratio prevents Layout Thrashing
                backgroundColor: '#f0f0f0', // Placeholder color while waiting (if not pre-fetched)
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}
        >
            <img
                key={src}
                src={src}
                alt={alt}
                loading="eager" // We handle lazy loading at the parent level; this is the 'active' image
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    animation: 'fadeIn 0.3s ease-in'
                }}
            />
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
};

// Basic Styles for layout
const styles = {
    container: {
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'sans-serif'
    },
    stage: {
        marginBottom: '1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        overflow: 'hidden'
    },
    controls: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    }
}
