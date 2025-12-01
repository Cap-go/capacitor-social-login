import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import './App.css';

interface KeyValuePair {
  key: string;
  value: string;
}

function SupabaseDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadAllKeyValuePairs(session.user.id);
      } else {
        navigate('/supabase');
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadAllKeyValuePairs(session.user.id);
      } else {
        navigate('/supabase');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadAllKeyValuePairs = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pairs: KeyValuePair[] = (data || []).map((item) => ({
        key: item.key,
        value: item.value || '',
      }));

      setKeyValuePairs(pairs);
    } catch (error: any) {
      console.error('Error loading values:', error);
      setErrorMessage('Failed to load data');
    }
  };

  const handleAdd = async () => {
    if (!user || !newKey.trim() || !newValue.trim()) {
      setErrorMessage('Please enter both key and value');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({
          user_id: user.id,
          key: newKey.trim(),
          value: newValue.trim(),
        }, {
          onConflict: 'user_id,key',
        });

      if (error) throw error;

      setNewKey('');
      setNewValue('');
      await loadAllKeyValuePairs(user.id);
      setStatusMessage(`Key "${newKey.trim()}" added successfully!`);
    } catch (error: any) {
      console.error('Error adding value:', error);
      setErrorMessage(error.message || 'Failed to add value');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (key: string) => {
    if (!user || !editingValue.trim()) {
      setErrorMessage('Please enter a value');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('user_data')
        .update({ value: editingValue.trim() })
        .eq('user_id', user.id)
        .eq('key', key);

      if (error) throw error;

      setEditingKey(null);
      setEditingValue('');
      await loadAllKeyValuePairs(user.id);
      setStatusMessage(`Key "${key}" updated successfully!`);
    } catch (error: any) {
      console.error('Error updating value:', error);
      setErrorMessage(error.message || 'Failed to update value');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (key: string) => {
    if (!user) return;

    setIsRemoving(key);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('user_data')
        .delete()
        .eq('user_id', user.id)
        .eq('key', key);

      if (error) throw error;

      await loadAllKeyValuePairs(user.id);
      setStatusMessage(`Key "${key}" removed successfully!`);
    } catch (error: any) {
      console.error('Error removing value:', error);
      setErrorMessage(error.message || 'Failed to remove value');
    } finally {
      setIsRemoving(null);
    }
  };

  const startEditing = (pair: KeyValuePair) => {
    setEditingKey(pair.key);
    setEditingValue(pair.value);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/supabase');
    } catch (error: any) {
      setErrorMessage('Failed to sign out');
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="app-card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-card">
        <header className="app-header">
          <div className="app-header-title">
            <h1>Dashboard</h1>
            <button
              type="button"
              className="back-button"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
          <p>Welcome, {user?.email}</p>
        </header>

        <section className="config">
          <span className="section-title">Add New Key-Value Pair</span>
          
          <div className="field">
            <label htmlFor="new-key">Key</label>
            <input
              id="new-key"
              type="text"
              placeholder="Enter key (e.g., testing)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              disabled={isSaving || isRemoving !== null}
            />
          </div>

          <div className="field">
            <label htmlFor="new-value">Value</label>
            <input
              id="new-value"
              type="text"
              placeholder="Enter value (e.g., very much so)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              disabled={isSaving || isRemoving !== null}
            />
            <p className="hint">Data is stored in Supabase table: user_data</p>
          </div>

          {statusMessage ? <div className="status status--success">{statusMessage}</div> : null}
          {errorMessage ? <div className="status status--error">{errorMessage}</div> : null}

          <div className="actions">
            <button 
              type="button" 
              onClick={handleAdd} 
              disabled={isSaving || isRemoving !== null || !newKey.trim() || !newValue.trim()}
            >
              {isSaving ? 'Adding...' : 'Add Key-Value Pair'}
            </button>
          </div>
        </section>

        {keyValuePairs.length > 0 && (
          <section className="config">
            <span className="section-title">Existing Key-Value Pairs</span>
            
            {keyValuePairs.map((pair) => (
              <div key={pair.key} className="key-value-item">
                <div className="field">
                  <label>{pair.key}</label>
                  {editingKey === pair.key ? (
                    <>
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        disabled={isSaving || isRemoving !== null}
                      />
                      <div className="key-value-actions">
                        <button
                          type="button"
                          onClick={() => handleEdit(pair.key)}
                          disabled={isSaving || isRemoving !== null || !editingValue.trim()}
                          className="save-button"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving || isRemoving !== null}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={pair.value}
                        readOnly
                        className="readonly-input"
                      />
                      <div className="key-value-actions">
                        <button
                          type="button"
                          onClick={() => startEditing(pair)}
                          disabled={isSaving || isRemoving !== null}
                          className="edit-button"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(pair.key)}
                          disabled={isSaving || isRemoving !== null}
                          className="remove-button"
                        >
                          {isRemoving === pair.key ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {keyValuePairs.length > 0 && (
          <section className="response">
            <h2>All Data</h2>
            <pre>{JSON.stringify(keyValuePairs.reduce((acc, pair) => ({ ...acc, [pair.key]: pair.value }), {}), null, 2)}</pre>
          </section>
        )}
      </div>
    </div>
  );
}

export default SupabaseDashboardPage;

