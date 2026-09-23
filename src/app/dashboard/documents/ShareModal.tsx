import  { useState, useEffect, useRef } from "react";
import { X,  Check,  UserPlus,  Lock, Link as LinkIcon } from "lucide-react";
import styles from "./ShareModal.module.css";
import { createPublicShareLink, shareDocumentPrivate, getCompanyUsers, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { isAdminRole } from "@/lib/role-utils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  itemType: "file" | "folder" | "category";
}

export default function ShareModal({ isOpen, onClose, itemId, itemName, itemType }: ShareModalProps) {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  
  const canCreatePublicShare = isAdminRole(authUser?.role);
  const canShareDocuments = canCreatePublicShare || authUser?.canShareDocuments !== false;
  
  const [emailInput, setEmailInput] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [accessType, setAccessType] = useState<"VIEW" | "COMMENT" | "EDIT">("VIEW");
  const [isSharing, setIsSharing] = useState(false);
  const [notify, setNotify] = useState(true);
  

  useEffect(() => {
    if (isOpen && authUser?.token) {
      getCompanyUsers(authUser.token, 1, 100).then((res) => {
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data as any).users || (res.data as any).items || [];
          setUsers(list);
        }
      });
    }
  }, [isOpen, authUser?.token]);

  useEffect(() => {
    if (emailInput.trim()) {
      const match = users.filter(u => 
        u.email.toLowerCase().includes(emailInput.toLowerCase()) || 
        u.name.toLowerCase().includes(emailInput.toLowerCase())
      );
      setFilteredUsers(match);
      setShowDropdown(match.length > 0);
    } else {
      setShowDropdown(false);
    }
  }, [emailInput, users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [publicLink, setPublicLink] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setEmailInput("");
      setAccessType("VIEW");
      setPublicLink("");
      setCopied(false);
    }
  }, [isOpen, itemId]);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!authUser?.token || !emailInput.trim()) return;
    setIsSharing(true);
    try {
      const payload = {
        email: emailInput.trim(),
        accessType,
        notify,
        type: itemType
      };
      const res = await shareDocumentPrivate(itemId, payload, authUser.token);
      
      if (res.success) {
        showToast("Shared successfully", "success");
        setEmailInput("");
      } else {
        showToast(res.error || "Failed to share document", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publicLink) {
      if (!canCreatePublicShare) {
        showToast("You don't have permission to create public links.", "error");
        return;
      }
      try {
        const payload: any = { type: itemType };
        
        const res = await createPublicShareLink(itemId, payload, authUser!.token);
        if (res.success && res.data) {
          const link = res.data.url || res.data.link || `${window.location.origin}/share/${res.data.token || res.data.id || itemId}`;
          setPublicLink(link);
          navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          showToast(res.error || "Failed to generate link", "error");
        }
      } catch (err) {
        showToast("Error generating link", "error");
      }
    } else {
      navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Share {itemName}</h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.inputGroup} ref={dropdownRef} style={{ position: "relative" }}>
            <div className={styles.inputWrapper}>
              <UserPlus className={styles.inputIcon} size={20} />
              <input 
                type="text" 
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onFocus={() => { if (filteredUsers.length > 0) setShowDropdown(true); }}
                placeholder={canShareDocuments ? "Add people or groups" : "You don't have permission to share privately"} 
                className={styles.input} 
                disabled={!canShareDocuments}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && emailInput.trim() && canShareDocuments) {
                    handleShare();
                  }
                }}
              />
            </div>
            
            {showDropdown && (
              <div className={styles.autocompleteDropdown}>
                {filteredUsers.map(u => (
                  <div 
                    key={u.id} 
                    className={styles.dropdownItem}
                    onClick={() => {
                      setEmailInput(u.email);
                      setShowDropdown(false);
                    }}
                  >
                    <div className={styles.dropdownAvatar}>{u.name.charAt(0).toUpperCase()}</div>
                    <div className={styles.dropdownUserInfo}>
                      <div className={styles.dropdownName}>{u.name}</div>
                      <div className={styles.dropdownEmail}>{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {emailInput.trim() && (
              <div className={styles.notifyOption}>
                <input 
                  type="checkbox" 
                  id="notify" 
                  checked={notify} 
                  onChange={(e) => setNotify(e.target.checked)} 
                />
                <label htmlFor="notify">Notify people</label>
              </div>
            )}
          </div>
          
          <div className={styles.sectionTitle}>People with access</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
             <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                {authUser?.name?.charAt(0).toUpperCase() || 'U'}
             </div>
             <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#202124' }}>{authUser?.name} (you)</div>
                <div style={{ fontSize: 12, color: '#5f6368' }}>{authUser?.email}</div>
             </div>
             <div style={{ fontSize: 14, color: '#5f6368' }}>Owner</div>
          </div>

          <div className={styles.sectionTitle}>General access</div>
          <div className={styles.generalAccess}>
            <Lock className={styles.lockIcon} size={20} />
            <div className={styles.accessInfo}>
              <div className={styles.accessTitle}>Restricted</div>
              <div className={styles.accessSubtitle}>Only people with access can open this file</div>
            </div>
            
            {canCreatePublicShare && !publicLink && (
              <div style={{ marginLeft: 'auto' }}>
                 <div className={styles.publicShareHint}>Public Link Enabled</div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.linkStatus}>
            {canCreatePublicShare ? (
              <button 
                onClick={handleCopyLink} 
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#1a73e8', fontWeight: 500, cursor: 'pointer', fontSize: '14px', padding: '8px', borderRadius: '4px' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
              >
                {copied ? <Check size={18} /> : <LinkIcon size={18} />}
                {copied ? "Link copied" : "Copy public link"}
              </button>
            ) : (
              <>
                <Lock size={16} />
                Public links unavailable
              </>
            )}
          </div>
          <button className={styles.doneBtn} onClick={emailInput.trim() ? handleShare : onClose} disabled={isSharing}>
            {emailInput.trim() ? (isSharing ? "Sharing..." : "Send") : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
