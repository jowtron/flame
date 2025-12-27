import { useState, useEffect } from 'react';
import classes from './FaviconSelector.module.css';

interface FaviconOption {
  url: string;
  type: string;
  name: string;
  size: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
}

interface FaviconSelectorProps {
  url: string;
  currentFaviconUrl?: string;
  onSelect: (faviconUrl: string) => void;
}

export const FaviconSelector = ({
  url,
  currentFaviconUrl,
  onSelect,
}: FaviconSelectorProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [favicons, setFavicons] = useState<FaviconOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(
    currentFaviconUrl || null
  );

  useEffect(() => {
    if (isOpen && url) {
      fetchFavicons();
    }
  }, [isOpen, url]);

  const fetchFavicons = async () => {
    if (!url) {
      setError('Please enter a URL first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await fetch(`/api/favicon/all?url=${encodedUrl}`);

      if (!response.ok) {
        throw new Error('Failed to fetch favicons');
      }

      const data = await response.json();
      setFavicons(data.favicons || []);

      if (data.favicons.length === 0) {
        setError('No favicons found for this URL');
      }
    } catch (err) {
      setError('Failed to load favicons');
      console.error('Favicon fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (faviconUrl: string) => {
    setSelectedUrl(faviconUrl);
  };

  const handleConfirm = async () => {
    if (!selectedUrl) return;

    setLoading(true);
    setError(null);

    try {
      // Download and save the selected favicon permanently
      const response = await fetch('/api/favicon/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ faviconUrl: selectedUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to save favicon');
      }

      const data = await response.json();

      // Pass the local path to the parent component
      onSelect(data.path);
      setIsOpen(false);
    } catch (err) {
      setError('Failed to save favicon');
      console.error('Favicon save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedUrl(null);
    onSelect('');
    setIsOpen(false);
  };

  const formatSize = (size: number | null): string => {
    if (!size) return 'Unknown';
    if (size < 1024) return `${size}B`;
    return `${(size / 1024).toFixed(1)}KB`;
  };

  return (
    <div className={classes.FaviconSelector}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={classes.SelectButton}
      >
        {currentFaviconUrl ? '🎨 Change Favicon' : '🎨 Select Favicon'}
      </button>

      {currentFaviconUrl && (
        <span className={classes.CurrentFavicon}>
          <img src={currentFaviconUrl} alt="Current favicon" />
        </span>
      )}

      {isOpen && (
        <div className={classes.Modal} onClick={() => setIsOpen(false)}>
          <div
            className={classes.ModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={classes.ModalHeader}>
              <h3>Select Favicon</h3>
              <button
                className={classes.CloseButton}
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={classes.ModalBody}>
              {loading && <p>Loading favicons...</p>}

              {error && <p className={classes.Error}>{error}</p>}

              {!loading && !error && favicons.length > 0 && (
                <div className={classes.FaviconGrid}>
                  {favicons.map((favicon, index) => (
                    <div
                      key={index}
                      className={`${classes.FaviconOption} ${
                        selectedUrl === favicon.url ? classes.Selected : ''
                      }`}
                      onClick={() => handleSelect(favicon.url)}
                    >
                      <img
                        src={favicon.url}
                        alt={favicon.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className={classes.FaviconInfo}>
                        <strong>{favicon.name}</strong>
                        {favicon.width && favicon.height && (
                          <small>{favicon.width}×{favicon.height}</small>
                        )}
                        <small>{formatSize(favicon.size)}</small>
                        {favicon.mimeType && (
                          <small>{favicon.mimeType.split('/')[1]}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={classes.ModalFooter}>
              <button
                type="button"
                onClick={handleClear}
                className={classes.FooterButton}
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedUrl}
                className={classes.FooterButton}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
