'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, FolderArchive, Download, Lock, FileImage, FileCode, FileType, FileSpreadsheet, FileArchive, FileVideo, FileAudio, File } from 'lucide-react';
import styles from './SharePage.module.css';

export default function SharedLinkPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const fetchShare = async () => {
      setError('');
      setLoading(true);
      try {
        let res;
        
        let tokenFromStorage = null;
        try {
          const stored = localStorage.getItem("crm_admin_auth");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.token) tokenFromStorage = parsed.token;
          }
        } catch (e) {}
        
        // Try private share first if authenticated
        if (tokenFromStorage) {
          res = await fetch(`http://localhost:3002/api/documents/share/${token}`, {
            headers: { Authorization: `Bearer ${tokenFromStorage}` }
          });
          if (res.ok) setIsPrivate(true);
        }
        
        // Fallback to public share if private fails or not authenticated
        if (!res || !res.ok) {
          res = await fetch(`http://localhost:3002/api/documents/public/${token}`);
          if (res.ok) setIsPrivate(false);
        }

        if (!res.ok) {
          throw new Error('Invalid or expired link');
        }

        const json = await res.json();
        setData(json.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchShare();
  }, [token]);

  useEffect(() => {
    if (!data?.share?.expiresAt) return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(data.share.expiresAt).getTime();
      const distance = expiry - now;
      
      if (distance < 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const minutes = Math.floor(distance / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className={styles.pageWrapper} style={{ justifyContent: 'center' }}>
        <div className={styles.loader}>
          <div className={styles.spinner} />
          <div>Preparing your secure document...</div>
        </div>
      </div>
    );
  }

  const getToken = () => {
    try {
      const stored = localStorage.getItem("crm_admin_auth");
      if (stored) return JSON.parse(stored)?.token || null;
    } catch {}
    return null;
  };

  const uToken = typeof window !== 'undefined' ? getToken() : null;

  if (error) {
    return (
      <div className={styles.pageWrapper} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className={styles.error} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <div>{error}</div>
          {!uToken && (
            <>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                If you are trying to access a private share, you must be logged in.
              </div>
              <a 
                href="/login" 
                style={{
                  background: 'white',
                  color: '#dc2626',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Log In
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  const isMultiFile = data.share.shareType === 'FOLDER' || data.share.shareType === 'CATEGORY';

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.brand}>In.App Documents</div>
      </header>

      <main className={styles.mainContent}>
        {timeLeft && timeLeft !== 'Expired' && (
          <div style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7', padding: '12px 24px', borderRadius: '12px', marginBottom: '24px', fontWeight: 600, textAlign: 'center', width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⏱️</span> This secure link will automatically expire in {timeLeft}
          </div>
        )}
        {timeLeft === 'Expired' && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '12px 24px', borderRadius: '12px', marginBottom: '24px', fontWeight: 600, textAlign: 'center', width: '100%', maxWidth: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span> This secure link has expired.
          </div>
        )}
        

        {isMultiFile ? (
          <div className={`${styles.card} ${styles.cardWide}`}>
            <div className={styles.headerWide}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4f46e5', marginBottom: '8px' }}>
                  <FolderArchive size={28} />
                  <h1 className={styles.title} style={{ margin: 0 }}>
                    Shared {data.share.shareType === 'FOLDER' ? 'Folder' : 'Category'}: {data.folder?.name || data.category?.name}
                  </h1>
                </div>
                <p className={styles.subtitle} style={{ margin: 0 }}>
                  Shared by {data.folder?.companyName || data.category?.companyName}
                </p>
              </div>
              <a 
                href={isPrivate && uToken 
                  ? `http://localhost:3002/api/documents/share/${token}/download?access_token=${uToken}` 
                  : `http://localhost:3002/api/documents/public/${token}/download`}
                className={styles.downloadBtn}
              >
                <Download size={18} />
                Download All (ZIP)
              </a>
            </div>

            <div className={styles.fileList}>
              {/* Group documents by folderName if present */}
              {(() => {
                const groups: { [key: string]: any[] } = {};
                const ungrouped: any[] = [];
                data.documents?.forEach((doc: any) => {
                  if (doc.folderName) {
                    if (!groups[doc.folderName]) groups[doc.folderName] = [];
                    groups[doc.folderName].push(doc);
                  } else {
                    ungrouped.push(doc);
                  }
                });

                const FileIcon = ({ mimeType }: { mimeType: string }) => {
                  if (mimeType.startsWith('image/')) return <FileImage size={18} color="#0ea5e9" style={{ marginRight: '12px', flexShrink: 0 }} />;
                  if (mimeType.startsWith('video/')) return <FileVideo size={18} color="#eab308" style={{ marginRight: '12px', flexShrink: 0 }} />;
                  if (mimeType.startsWith('audio/')) return <FileAudio size={18} color="#f97316" style={{ marginRight: '12px', flexShrink: 0 }} />;
                  if (mimeType.includes('pdf')) return <FileText size={18} color="#ef4444" style={{ marginRight: '12px', flexShrink: 0 }} />;
                  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet size={18} color="#10b981" style={{ marginRight: '12px', flexShrink: 0 }} />;
                  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return <FileText size={18} color="#3b82f6" style={{ marginRight: '12px', flexShrink: 0 }} />;
                  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar')) return <FileArchive size={18} color="#f59e0b" style={{ marginRight: '12px', flexShrink: 0 }} />;
                  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript') || mimeType.includes('html')) return <FileCode size={18} color="#8b5cf6" style={{ marginRight: '12px', flexShrink: 0 }} />;
                  return <File size={18} color="#94a3b8" style={{ marginRight: '12px', flexShrink: 0 }} />;
                };

                return (
                  <>
                    {Object.entries(groups).map(([folderName, docs]) => (
                      <div key={folderName} style={{ marginBottom: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', color: '#334155', fontWeight: 600 }}>
                          <FolderArchive size={18} style={{ marginRight: '8px', color: '#6366f1' }} />
                          {folderName}
                        </div>
                        <div className={styles.fileGrid}>
                          {docs.map(doc => (
                            <div key={doc.id} className={styles.fileItem} style={{ background: 'white' }}>
                              <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                                <FileIcon mimeType={doc.mimeType || ''} />
                                <span className={styles.fileItemName} title={doc.fileName}>{doc.fileName}</span>
                              </div>
                              <a 
                                href={isPrivate && uToken 
                                  ? `http://localhost:3002/api/documents/share/${token}/download/${doc.id}?access_token=${uToken}` 
                                  : `http://localhost:3002/api/documents/public/${token}/download/${doc.id}`}
                                className={styles.fileDownloadBtn}
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {ungrouped.length > 0 && (
                      <div className={styles.fileGrid}>
                        {ungrouped.map((doc: any) => (
                          <div key={doc.id} className={styles.fileItem}>
                            <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                              <FileIcon mimeType={doc.mimeType || ''} />
                              <span className={styles.fileItemName} title={doc.fileName}>{doc.fileName}</span>
                            </div>
                            <a 
                              href={isPrivate && uToken 
                                ? `http://localhost:3002/api/documents/share/${token}/download/${doc.id}?access_token=${uToken}` 
                                : `http://localhost:3002/api/documents/public/${token}/download/${doc.id}`}
                              className={styles.fileDownloadBtn}
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            <div className={styles.metaInfo}>
              <Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              Securely shared via In.App
            </div>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.iconWrapper}>
              <FileText size={32} />
            </div>
            <h1 className={styles.title}>Secure File Share</h1>
            <p className={styles.subtitle}>
              You've been sent a secure document to download.
            </p>
            
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div className={styles.fileName}>{data.document.fileName}</div>
            </div>

            <a 
              href={isPrivate && uToken 
                ? `http://localhost:3002/api/documents/share/${token}/download?access_token=${uToken}` 
                : `http://localhost:3002/api/documents/public/${token}/download`}
              className={styles.downloadBtn}
            >
              <Download size={20} />
              Download File
            </a>
            
            <div className={styles.metaInfo}>
              <Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              Securely shared via In.App
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
