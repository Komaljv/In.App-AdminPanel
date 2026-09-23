'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Download, Lock, ArrowLeft } from 'lucide-react';
import { getPrivateDocument } from "@/lib/api";
import { AuthProvider, useAuth } from '@/lib/auth-context';
import styles from './DocumentView.module.css';

function getFileIcon(mimeTypeOrName: string) {
  return <FileText size={16} />;
}

function DocumentViewContent() {
  const params = useParams();
  const router = useRouter();
  const token = params.id as string;
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    
    if (!authUser) {
      router.replace('/login');
      return;
    }

    getPrivateDocument(token, authUser.token)
      .then(res => {
        if (!res.success) throw new Error(res.error || 'Failed to load document');
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, authUser, isAuthLoading, router]);

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

  if (error) {
    return (
      <div className={styles.pageWrapper} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className={styles.error}>
          {error}
        </div>
        <button onClick={() => router.push('/dashboard/documents')} className={styles.backBtn}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isImage = data.mimeType?.startsWith('image/') || data.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = data.mimeType === 'application/pdf' || data.fileName.toLowerCase().endsWith('.pdf');

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!data?.fileUrl) return;
    try {
      setIsDownloading(true);
      
      // Fetch the file directly from the URL provided in the document data
      // We append a timestamp to the URL to bypass the browser cache, which might have cached a non-CORS response
      const cacheBuster = data.fileUrl.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      const response = await fetch(`${data.fileUrl}${cacheBuster}`, {
        mode: 'cors',
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error("Failed to download file from URL");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed", err);
      // Fallback: open the URL directly in a new tab
      window.open(data.fileUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.brand}>In.App Documents</div>
        <button onClick={() => router.push('/dashboard/documents')} className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </header>

      <main className={styles.splitLayout}>
        <div className={styles.viewerPane}>
          {isPdf ? (
            <iframe 
              src={`${data.fileUrl}#toolbar=0`} 
              className={styles.documentIframe}
              title={data.fileName}
            />
          ) : isImage ? (
            <img 
              src={data.fileUrl} 
              alt={data.fileName} 
              className={styles.documentImage}
            />
          ) : (
            <div className={styles.genericFile}>
              <FileText size={80} />
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{data.fileName}</div>
              <div>Preview not available for this file type</div>
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h1 className={styles.title}>{data.fileName}</h1>
            <p className={styles.subtitle}>Securely shared with you</p>
          </div>
          
          <div className={styles.sidebarContent}>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>File Type</div>
              <div className={styles.metaValue}>
                {getFileIcon(data.mimeType || data.fileName)}
                {data.mimeType || 'Unknown'}
              </div>
            </div>

            {data.uploader && (
              <div className={styles.metaItem}>
                <div className={styles.metaLabel}>Uploaded By</div>
                <div className={styles.metaValue}>{data.uploader.name}</div>
              </div>
            )}
            
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>Access</div>
              <div className={styles.metaValue}>
                <Lock size={16} style={{ color: '#10b981' }} />
                Private & Secure
              </div>
            </div>
          </div>

          <div className={styles.sidebarFooter}>
            <button 
              onClick={handleDownload}
              disabled={isDownloading}
              className={styles.downloadBtn}
            >
              <Download size={20} />
              {isDownloading ? "Downloading..." : "Download File"}
            </button>
            <div className={styles.secureBadge}>
              <Lock size={14} /> Encrypted via In.App
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function DocumentViewPage() {
  return (
    <AuthProvider>
      <DocumentViewContent />
    </AuthProvider>
  );
}
