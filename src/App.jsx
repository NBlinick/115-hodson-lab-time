import React, { useState, useEffect } from 'react';

// Target Google Calendar ID for "115 Hodson Lab Time"
const GCAL_TARGET_ID = "umn.edu_utg0nurqmmirg5udgvi2dim1gs@group.calendar.google.com";

const DEFAULT_LAB_ASSETS = [
  // Microscopes
  { id: 'scope-1', name: 'Leica EZ4 W Stereo Scope', brand: 'Leica', model: 'EZ4 W', category: 'Microscope', location: 'Station 1A (North Wall)', x: 15, y: 20, notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scope-2', name: 'Olympus CX23 Microscope', brand: 'Olympus', model: 'CX23', category: 'Microscope', location: 'Station 1B (North Wall)', x: 30, y: 20, notionUrl: 'https://notion.so', imageUrl: '' },
  
  // Weighing Scales
  { id: 'scale-1', name: 'Mettler Toledo Balance', brand: 'Mettler Toledo', model: 'ME204T', category: 'Weighing Scale', location: 'Weighing Bench 1', x: 15, y: 55, notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scale-2', name: 'Ohaus Navigator Scale', brand: 'Ohaus', model: 'NV221', category: 'Weighing Scale', location: 'Weighing Bench 2', x: 30, y: 55, notionUrl: 'https://notion.so', imageUrl: '' },
  
  // Bench Seats
  { id: 'seat-1a', name: 'Bench Seat 1A', brand: 'Labconco', model: 'Ergonomic Stool', category: 'Seat', location: 'Center Bench Row 1', x: 50, y: 30, notionUrl: '', imageUrl: '' },
  { id: 'seat-1b', name: 'Bench Seat 1B', brand: 'Labconco', model: 'Ergonomic Stool', category: 'Seat', location: 'Center Bench Row 1', x: 65, y: 30, notionUrl: '', imageUrl: '' },
  { id: 'seat-2a', name: 'Bench Seat 2A', brand: 'Labconco', model: 'Ergonomic Stool', category: 'Seat', location: 'Center Bench Row 2', x: 50, y: 65, notionUrl: '', imageUrl: '' },
  { id: 'seat-2b', name: 'Bench Seat 2B', brand: 'Labconco', model: 'Ergonomic Stool', category: 'Seat', location: 'Center Bench Row 2', x: 65, y: 65, notionUrl: '', imageUrl: '' },

  // Drying Ovens
  { id: 'oven-1', name: 'Fisher IsoTemp Drying Oven', brand: 'Fisher Scientific', model: '280A', category: 'Drying Oven', location: 'South Wall Bay', x: 85, y: 25, notionUrl: '', imageUrl: '' },

  // Sinks
  { id: 'sink-1', name: 'North Wet Lab Sink', brand: 'Justrite', model: 'Stainless Steel', category: 'Sink', location: 'Northwest Corner', x: 85, y: 70, notionUrl: '', imageUrl: '' }
];

export default function App() {
  const [assets, setAssets] = useState(DEFAULT_LAB_ASSETS);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);

  // Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [generatedCalendarLinks, setGeneratedCalendarLinks] = useState([]);

  useEffect(() => {
    async function fetchNotionData() {
      try {
        const res = await fetch('/api/notion');
        const data = await res.json();

        if (res.ok && data.results && data.results.length > 0) {
          const filtered = data.results.filter((page) => {
            const props = page.properties || {};
            const target = (props['App Target']?.select?.name || props['App Target']?.rich_text?.[0]?.plain_text || '').toLowerCase();
            return !target || target.includes('hodson');
          });

          const parsed = filtered.map((page, idx) => {
            const props = page.properties || {};
            
            const name = props['Asset Name']?.title?.[0]?.plain_text || props['Name']?.title?.[0]?.plain_text || 'Unnamed Asset';
            const category = props['Category']?.select?.name || props['Category']?.rich_text?.[0]?.plain_text || 'Seat';
            const brand = props['Brand']?.rich_text?.[0]?.plain_text || props['Brand']?.select?.name || '';
            const model = props['Model']?.rich_text?.[0]?.plain_text || props['Model']?.select?.name || '';
            const location = props['Location']?.select?.name || props['Location']?.rich_text?.[0]?.plain_text || 'Room 115';

            let photoUrl = '';
            const photoKey = Object.keys(props).find(k => k.toLowerCase() === 'photo' || k.toLowerCase() === 'image');
            if (photoKey && props[photoKey]?.files?.[0]) {
              const fileObj = props[photoKey].files[0];
              photoUrl = fileObj.file?.url || fileObj.external?.url || '';
            }

            const posX = 15 + ((idx % 4) * 22);
            const posY = 20 + (Math.floor(idx / 4) * 25);

            return {
              id: page.id,
              name,
              brand,
              model,
              category,
              location,
              x: posX,
              y: posY,
              notionUrl: page.url,
              imageUrl: photoUrl
            };
          });

          setAssets(parsed);
          setNotionConnected(true);
        }
      } catch (err) {
        console.log('Using local spatial default assets');
      }
    }
    fetchNotionData();
  }, []);

  const categories = ['all', ...Array.from(new Set(assets.map(a => a.category)))];

  const toggleAssetSelection = (asset) => {
    setBookingSuccess(false);
    setSelectedAssets((prev) => {
      const exists = prev.some((a) => a.id === asset.id);
      if (exists) {
        return prev.filter((a) => a.id !== asset.id);
      } else {
        return [...prev, asset];
      }
    });
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (selectedAssets.length === 0) return;

    const finalEndDate = endDate || startDate;
    const startISO = `${startDate.replace(/-/g, '')}T${startTime.replace(':', '')}00`;
    const endISO = `${finalEndDate.replace(/-/g, '')}T${endTime.replace(':', '')}00`;

    const links = selectedAssets.map((asset) => {
      const title = encodeURIComponent(`Reservation: ${asset.name}${asset.model ? ` (${asset.model})` : ''}`);
      const details = encodeURIComponent(
        `Researcher: ${userName} (${userEmail})\nAsset: ${asset.name}\nBrand & Model: ${asset.brand || 'N/A'} ${asset.model || ''}\nCategory: ${asset.category}\nStation Location: ${asset.location}\nDuration: ${startDate} ${startTime} to ${finalEndDate} ${endTime}\nNotes: ${notes}\nNotion Maintenance Log: ${asset.notionUrl || 'N/A'}`
      );
      const location = encodeURIComponent(`115 Hodson Lab - ${asset.location}`);

      return {
        assetName: asset.name,
        url: `https://calendar.google.com/calendar/render?action=TEMPLATE&src=${encodeURIComponent(GCAL_TARGET_ID)}&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}&ctz=America%2FChicago`
      };
    });

    setGeneratedCalendarLinks(links);
    setBookingSuccess(true);
  };

  const handleAssetUpdate = (id, field, value) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    setSelectedAssets(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const filteredAssets = assets.filter(a => {
    const matchesCat = activeCategory === 'all' || a.category === activeCategory;
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (a.brand && a.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const getCategoryColor = (cat) => {
    const c = cat.toLowerCase();
    if (c.includes('scope')) return '#3b82f6';
    if (c.includes('scale') || c.includes('balance')) return '#10b981';
    if (c.includes('oven')) return '#f59e0b';
    if (c.includes('sink')) return '#06b6d4';
    return '#8b5cf6';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '24px' }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto 20px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: 0 }}>115 Hodson Lab Multi-Asset Reservation Portal</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
            Click items on the room visual or grid to reserve seats and equipment on <strong>115 Hodson Lab Time</strong> calendar.
          </p>
        </div>

        <button 
          onClick={() => setIsAdminMode(!isAdminMode)}
          style={{ padding: '8px 16px', backgroundColor: isAdminMode ? '#78350f' : '#1e293b', color: isAdminMode ? '#fde68a' : '#cbd5e1', border: '1px solid #475569', cursor: 'pointer', borderRadius: '8px', fontSize: '13px' }}
        >
          {isAdminMode ? 'Exit Admin Mode' : 'Admin & Photo Editor'}
        </button>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
        {/* Left Column: Visual Floor Map & Grid */}
        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <input 
              type="text"
              placeholder="Search equipment, station, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '220px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
            />

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeCategory === cat ? '#2563eb' : '#0f172a',
                    color: '#fff',
                    textTransform: 'capitalize'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 2D Visual Map Canvas */}
          <div style={{ position: 'relative', width: '100%', height: '380px', backgroundColor: '#020617', border: '2px dashed #334155', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ position: 'absolute', top: '10px', left: '12px', fontSize: '11px', color: '#475569', fontWeight: 'bold' }}>
              ROOM 115 VISUAL FLOOR PLAN (CLICK NODES TO MULTI-SELECT)
            </div>

            {filteredAssets.map(asset => {
              const isSelected = selectedAssets.some(a => a.id === asset.id);
              const color = getCategoryColor(asset.category);

              return (
                <div
                  key={asset.id}
                  onClick={() => toggleAssetSelection(asset)}
                  style={{
                    position: 'absolute',
                    left: `${asset.x}%`,
                    top: `${asset.y}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: isSelected ? '#ffffff' : '#0f172a',
                    color: isSelected ? '#000000' : '#ffffff',
                    border: `2px solid ${color}`,
                    borderRadius: '10px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 0 15px ${color}` : 'none',
                    transition: 'all 0.2s ease',
                    zIndex: isSelected ? 10 : 1,
                    textAlign: 'center',
                    minWidth: '95px'
                  }}
                >
                  {isSelected && (
                    <span style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                  )}
                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: isSelected ? '#000' : color, textTransform: 'uppercase' }}>{asset.category}</div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{asset.name}</div>
                  <div style={{ fontSize: '9px', color: isSelected ? '#475569' : '#94a3b8' }}>{asset.location}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Reservation & Admin Panel */}
        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', height: 'fit-content' }}>
          {isAdminMode ? (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '16px' }}>Admin & Photo Editor</h2>
              {selectedAssets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedAssets.map((asset) => (
                    <div key={asset.id} style={{ borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#60a5fa', marginBottom: '8px' }}>{asset.name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Brand / Make</label>
                          <input type="text" value={asset.brand || ''} onChange={(e) => handleAssetUpdate(asset.id, 'brand', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Model</label>
                          <input type="text" value={asset.model || ''} onChange={(e) => handleAssetUpdate(asset.id, 'model', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Image URL</label>
                          <input type="text" placeholder="https://..." value={asset.imageUrl || ''} onChange={(e) => handleAssetUpdate(asset.id, 'imageUrl', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                        </div>
                        {(asset.category.toLowerCase().includes('scope') || asset.category.toLowerCase().includes('scale')) && (
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Notion Maintenance URL</label>
                            <input type="text" value={asset.notionUrl || ''} onChange={(e) => handleAssetUpdate(asset.id, 'notionUrl', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>Select assets from the visual map to edit details or upload photos.</p>
              )}
            </div>
          ) : (
            <div>
              {selectedAssets.length > 0 ? (
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                    Selected ({selectedAssets.length}) Lab Asset(s)
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {selectedAssets.map((asset) => (
                      <div key={asset.id} style={{ padding: '10px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                        {asset.imageUrl && (
                          <img src={asset.imageUrl} alt={asset.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', marginBottom: '6px' }} />
                        )}
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{asset.name}</div>
                        {(asset.brand || asset.model) && (
                          <div style={{ fontSize: '11px', color: '#93c5fd' }}>{[asset.brand, asset.model].filter(Boolean).join(' · ')}</div>
                        )}
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>📍 {asset.location}</div>
                        {(asset.category.toLowerCase().includes('scope') || asset.category.toLowerCase().includes('scale')) && (
                          <a href={asset.notionUrl || 'https://notion.so'} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}>
                            View Notion Maintenance Records ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {bookingSuccess ? (
                    <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '8px' }}>Reservations Prepared!</div>
                      <p style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                        Click below to add events to 115 Hodson Lab Time Calendar:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {generatedCalendarLinks.map((link, idx) => (
                          <a key={idx} href={link.url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', backgroundColor: '#059669', color: '#fff', padding: '10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
                            Add {link.assetName} to Calendar
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Start Date</label>
                          <input type="date" required value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endDate || endDate < e.target.value) setEndDate(e.target.value); }} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff', colorScheme: 'dark' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>End Date</label>
                          <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff', colorScheme: 'dark' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Start Time</label>
                          <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff', colorScheme: 'dark' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>End Time</label>
                          <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff', colorScheme: 'dark' }} />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Researcher Name</label>
                        <input type="text" required placeholder="Jane Doe" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Researcher Email</label>
                        <input type="email" required placeholder="jane@university.edu" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Project Notes</label>
                        <textarea rows={2} placeholder="Protocol details or sample prep..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                      </div>

                      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>
                        Reserve Selected ({selectedAssets.length}) Asset(s)
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                  Click nodes on the visual floor plan to select one or more assets to reserve.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}