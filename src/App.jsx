import React, { useState, useEffect } from 'react';

const GOOGLE_CALENDAR_ID = "umn.edu_utg0nurqmmirg5udgvi2dim1gs@group.calendar.google.com";
const CALENDAR_EMBED_URL = "https://calendar.google.com/calendar/embed?src=umn.edu_utg0nurqmmirg5udgvi2dim1gs%40group.calendar.google.com&ctz=America%2FChicago";

const DEFAULT_ASSETS = [
  { id: 'bench-1a', name: 'Lab Bench 1A - Seat', brand: 'Generic', model: 'Standard Bench', type: 'seat', location: 'Bench Row 1', status: 'available', notionUrl: '', imageUrl: '' },
  { id: 'bench-1b', name: 'Lab Bench 1B - Seat', brand: 'Generic', model: 'Standard Bench', type: 'seat', location: 'Bench Row 1', status: 'available', notionUrl: '', imageUrl: '' },
  { id: 'scope-01', name: 'Leica Stereo Microscope #1', brand: 'Leica', model: 'EZ4 W', type: 'microscope', location: 'Microscope Station A', status: 'available', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scope-02', name: 'Olympus Brightfield Microscope #2', brand: 'Olympus', model: 'CX23', type: 'microscope', location: 'Microscope Station B', status: 'available', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scale-01', name: 'Mettler Toledo Analytical Balance', brand: 'Mettler Toledo', model: 'ME204T', type: 'scale', location: 'Weighing Bay 1', status: 'available', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scale-02', name: 'Ohaus Top-Loading Precision Scale', brand: 'Ohaus', model: 'Navigator NV', type: 'scale', location: 'Weighing Bay 2', status: 'available', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'sink-01', name: 'Main Wet Lab Sink', brand: 'Just Mfg', model: 'DL-1824', type: 'sink', location: 'North Wall Sink', status: 'available', notionUrl: '', imageUrl: '' },
  { id: 'sink-02', name: 'Chemical Decontamination Sink', brand: 'Guardian', model: 'G1540', type: 'sink', location: 'South Wall Sink', status: 'available', notionUrl: '', imageUrl: '' },
  { id: 'oven-01', name: 'Precision Vacuum Drying Oven #1', brand: 'Fisherbrand', model: 'IsoTemp 280A', type: 'drying oven', location: 'East Prep Wall', status: 'available', notionUrl: '', imageUrl: '' },
  { id: 'oven-02', name: 'High-Temp Forced Air Drying Oven #2', brand: 'Binder', model: 'FD 115', type: 'drying oven', location: 'East Prep Wall', status: 'available', notionUrl: '', imageUrl: '' }
];

const CATEGORIES = [
  { id: 'all', label: 'All Equipment' },
  { id: 'microscope', label: 'Microscopes' },
  { id: 'scale', label: 'Scales' },
  { id: 'sink', label: 'Sinks' },
  { id: 'drying oven', label: 'Drying Ovens' },
  { id: 'seat', label: 'Seats' }
];

export default function App() {
  const [assets, setAssets] = useState(DEFAULT_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionStatusMsg, setNotionStatusMsg] = useState('Checking Notion connection...');

  // Flexible Date & Time Booking Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState('');

  useEffect(() => {
    async function fetchNotionData() {
      try {
        const res = await fetch('/api/notion');
        const data = await res.json();

        if (res.ok && data.results && data.results.length > 0) {
          const parsed = data.results.map((page) => {
            const props = page.properties || {};
            
            let name = 'Unnamed Asset';
            Object.keys(props).forEach((key) => {
              if (props[key]?.type === 'title' && props[key]?.title?.[0]?.plain_text) {
                name = props[key].title[0].plain_text;
              }
            });

            let photoUrl = '';
            const photoKey = Object.keys(props).find(k => k.toLowerCase() === 'photo' || k.toLowerCase() === 'image');
            if (photoKey && props[photoKey]?.files?.[0]) {
              const fileObj = props[photoKey].files[0];
              photoUrl = fileObj.file?.url || fileObj.external?.url || '';
            }

            const rawCat = (props['Category']?.select?.name || props['Type']?.select?.name || 'seat').toLowerCase();
            let category = 'seat';
            if (rawCat.includes('microscope')) category = 'microscope';
            else if (rawCat.includes('scale') || rawCat.includes('balance')) category = 'scale';
            else if (rawCat.includes('sink')) category = 'sink';
            else if (rawCat.includes('oven') || rawCat.includes('dry')) category = 'drying oven';

            const location = props['Location']?.select?.name || props['Location']?.rich_text?.[0]?.plain_text || '115 Hodson Lab';
            const brand = props['Brand']?.rich_text?.[0]?.plain_text || props['Brand']?.select?.name || '';
            const model = props['Model']?.rich_text?.[0]?.plain_text || props['Model']?.select?.name || '';

            return {
              id: page.id,
              name: name,
              brand: brand,
              model: model,
              type: category,
              location: location,
              status: 'available',
              notionUrl: page.url,
              imageUrl: photoUrl
            };
          });

          setAssets(parsed);
          setNotionConnected(true);
          setNotionStatusMsg('Connected to Notion Database');
        } else {
          setNotionStatusMsg(data.message || 'Displaying local fallback asset data.');
        }
      } catch (err) {
        setNotionStatusMsg('Local dev mode: serverless /api/notion runs when published to Vercel.');
      }
    }
    fetchNotionData();
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesFilter = activeFilter === 'all' || asset.type === activeFilter;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (asset.brand && asset.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (asset.model && asset.model.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    const finalEndDate = endDate || startDate;
    const startISO = `${startDate.replace(/-/g, '')}T${startTime.replace(':', '')}00`;
    const endISO = `${finalEndDate.replace(/-/g, '')}T${endTime.replace(':', '')}00`;

    const title = encodeURIComponent(`${selectedAsset.name}${selectedAsset.model ? ` (${selectedAsset.model})` : ''}`);
    const details = encodeURIComponent(
      `Reserved by: ${userName} (${userEmail})\nEquipment: ${selectedAsset.name}\nBrand & Model: ${selectedAsset.brand || 'N/A'} ${selectedAsset.model || ''}\nLocation: ${selectedAsset.location}\nCheckout Duration: ${startDate} ${startTime} to ${finalEndDate} ${endTime}\nProject Notes: ${notes}\nNotion Maintenance Records: ${selectedAsset.notionUrl || 'N/A'}`
    );
    const location = encodeURIComponent(`Room 115 Hodson Lab - ${selectedAsset.location}`);

    const gCalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&src=${encodeURIComponent(GOOGLE_CALENDAR_ID)}&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}&ctz=America%2FChicago`;
    
    setCalendarUrl(gCalLink);
    setBookingSuccess(true);
  };

  const handleAssetUpdate = (id, field, value) => {
    setAssets(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    if (selectedAsset && selectedAsset.id === id) {
      setSelectedAsset(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '24px' }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>115 Hodson Lab Time</h1>
            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: notionConnected ? '1px solid #059669' : '1px solid #d97706', backgroundColor: notionConnected ? '#064e3b' : '#78350f', color: notionConnected ? '#34d399' : '#fde68a' }}>
              {notionConnected ? 'Live Notion Sync' : 'Default Asset Mode'}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Flexible Reservation Portal for Seats, Microscopes, Scales, Sinks, and Drying Ovens
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <a 
            href={CALENDAR_EMBED_URL}
            target="_blank"
            rel="noreferrer"
            style={{ padding: '8px 16px', backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}
          >
            Live UMN Calendar
          </a>

          <button 
            onClick={() => setIsAdminMode(!isAdminMode)}
            style={{ padding: '8px 16px', backgroundColor: isAdminMode ? '#78350f' : '#1e293b', color: isAdminMode ? '#fde68a' : '#cbd5e1', border: '1px solid #475569', cursor: 'pointer', fontSize: '14px' }}
          >
            {isAdminMode ? 'Exit Admin Mode' : 'Admin & Photo Editor'}
          </button>
        </div>
      </header>

      {!notionConnected && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 16px auto', padding: '12px 16px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
          <strong>Sync Status:</strong> {notionStatusMsg}
        </div>
      )}

      <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <section>
          <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
            <input 
              type="text"
              placeholder="Search equipment, brand, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '220px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc' }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeFilter === cat.id ? '#2563eb' : '#0f172a',
                    color: '#ffffff',
                    fontWeight: activeFilter === cat.id ? 'bold' : 'normal'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
            <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Equipment Overview - Room 115 Hodson
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {filteredAssets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                return (
                  <div
                    key={asset.id}
                    onClick={() => { setSelectedAsset(asset); setBookingSuccess(false); }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #1e293b',
                      backgroundColor: isSelected ? '#172554' : '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    {asset.imageUrl ? (
                      <img src={asset.imageUrl} alt={asset.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '60px', backgroundColor: '#020617', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#475569', textTransform: 'uppercase' }}>
                        {asset.type}
                      </div>
                    )}

                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#f8fafc' }}>{asset.name}</div>
                    {(asset.brand || asset.model) && (
                      <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '4px' }}>{[asset.brand, asset.model].filter(Boolean).join(' · ')}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{asset.location}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', height: 'fit-content' }}>
          {isAdminMode ? (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '16px' }}>Admin Asset & Photo Editor</h2>
              {selectedAsset ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Equipment Name</label>
                    <input type="text" value={selectedAsset.name} onChange={(e) => handleAssetUpdate(selectedAsset.id, 'name', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Image URL</label>
                    <input type="text" placeholder="https://..." value={selectedAsset.imageUrl || ''} onChange={(e) => handleAssetUpdate(selectedAsset.id, 'imageUrl', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Notion Maintenance Link</label>
                    <input type="text" placeholder="https://notion.so/..." value={selectedAsset.notionUrl || ''} onChange={(e) => handleAssetUpdate(selectedAsset.id, 'notionUrl', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>Select an asset to edit details.</p>
              )}
            </div>
          ) : (
            <div>
              {selectedAsset ? (
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{selectedAsset.name}</h2>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0' }}>{selectedAsset.location}</p>

                  {(selectedAsset.type === 'microscope' || selectedAsset.type === 'scale') && (
                    <div style={{ padding: '10px', backgroundColor: '#0f172a', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Maintenance Records</span>
                      <a href={selectedAsset.notionUrl || 'https://notion.so'} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'underline' }}>View in Notion</a>
                    </div>
                  )}

                  {bookingSuccess ? (
                    <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '8px' }}>Reservation Details Prepared!</div>
                      <a href={calendarUrl} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', backgroundColor: '#059669', color: '#fff', padding: '10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
                        Add to 115 Hodson Lab Time Calendar
                      </a>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Start Date</label>
                          <input 
                            type="date" 
                            required 
                            value={startDate} 
                            onChange={(e) => { 
                              setStartDate(e.target.value); 
                              if (!endDate || endDate < e.target.value) setEndDate(e.target.value); 
                            }} 
                            style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>End Date (Optional)</label>
                          <input 
                            type="date" 
                            min={startDate} 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} 
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Start Time</label>
                          <input 
                            type="time" 
                            required 
                            value={startTime} 
                            onChange={(e) => setStartTime(e.target.value)} 
                            style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>End Time</label>
                          <input 
                            type="time" 
                            required 
                            value={endTime} 
                            onChange={(e) => setEndTime(e.target.value)} 
                            style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} 
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Researcher Name</label>
                        <input type="text" required placeholder="Jane Doe" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Contact Email</label>
                        <input type="email" required placeholder="jane@university.edu" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Project Notes / Protocol</label>
                        <textarea rows={2} placeholder="Experiment details..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                      </div>

                      <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                        Reserve Selected Time Slot
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                  Select any seat, microscope, scale, sink, or oven to reserve.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}