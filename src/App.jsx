import React, { useState, useEffect } from 'react';

// Google Calendar ID for "115 Hodson Lab Time"
const GCAL_TARGET_ID = "umn.edu_utg0nurqmmirg5udgvi2dim1gs@group.calendar.google.com";

const DEFAULT_LAB_ASSETS = [
  { id: 'scope-1', name: 'Leica EZ4 W Stereo Scope', brand: 'Leica', model: 'EZ4 W', category: 'Microscope', location: 'Station 1A (North Wall)', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scope-2', name: 'Olympus CX23 Microscope', brand: 'Olympus', model: 'CX23', category: 'Microscope', location: 'Station 1B (North Wall)', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scale-1', name: 'Mettler Toledo Balance', brand: 'Mettler Toledo', model: 'ME204T', category: 'Weighing Scale', location: 'Weighing Bench 1', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scale-2', name: 'Ohaus Navigator Scale', brand: 'Ohaus', model: 'NV221', category: 'Weighing Scale', location: 'Weighing Bench 2', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'sink-1', name: 'North Wet Lab Sink', brand: 'Justrite', model: 'Stainless Steel', category: 'Sink', location: 'Northwest Corner', notionUrl: '', imageUrl: '' },
  { id: 'oven-1', name: 'Fisher IsoTemp Oven', brand: 'Fisher Scientific', model: '280A', category: 'Drying Oven', location: 'South Wall Bay', notionUrl: '', imageUrl: '' },
  { id: 'seat-1a', name: 'Bench Seat 1A', brand: 'Labconco', model: 'Ergonomic Stool', category: 'Seat', location: 'Center Bench Row 1', notionUrl: '', imageUrl: '' },
  { id: 'seat-1b', name: 'Bench Seat 1B', brand: 'Labconco', model: 'Ergonomic Stool', category: 'Seat', location: 'Center Bench Row 1', notionUrl: '', imageUrl: '' },
  { id: 'seat-2a', name: 'Bench Seat 2A', brand: 'Labconco', model: 'Ergonomic Stool', category: 'Seat', location: 'Center Bench Row 2', notionUrl: '', imageUrl: '' },
  { id: 'seat-2b', name: 'Bench Seat 2B', brand: 'Labconco', model: 'Ergonomic Stool', category: 'Seat', location: 'Center Bench Row 2', notionUrl: '', imageUrl: '' }
];

// Explicit Sorting Priority: Microscopes (1) -> Scales (2) -> Sinks (3) -> Ovens (4) -> Seats (5) -> Other (6)
function getLabCategoryRank(category) {
  const c = (category || '').toLowerCase();
  if (c.includes('scope') || c.includes('microscope')) return 1;
  if (c.includes('scale') || c.includes('balance') || c.includes('weigh')) return 2;
  if (c.includes('sink') || c.includes('wash')) return 3;
  if (c.includes('oven') || c.includes('dry')) return 4;
  if (c.includes('seat') || c.includes('bench') || c.includes('stool')) return 5;
  return 6;
}

export default function App() {
  const [assets, setAssets] = useState(DEFAULT_LAB_ASSETS);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionStatusMsg, setNotionStatusMsg] = useState('Checking Notion sync...');

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

          const parsed = filtered.map((page) => {
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

            return {
              id: page.id,
              name,
              brand,
              model,
              category,
              location,
              notionUrl: page.url,
              imageUrl: photoUrl
            };
          });

          // Sort assets by custom rank priority
          parsed.sort((a, b) => {
            const rankA = getLabCategoryRank(a.category);
            const rankB = getLabCategoryRank(b.category);
            if (rankA !== rankB) return rankA - rankB;
            return a.name.localeCompare(b.name);
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

  // Dynamically derive unique category buttons, sorted by rank priority
  const uniqueCats = Array.from(new Set(assets.map(a => a.category))).filter(Boolean);
  uniqueCats.sort((a, b) => getLabCategoryRank(a) - getLabCategoryRank(b));
  const dynamicCategories = ['all', ...uniqueCats];

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
    const matchesCat = activeCategory === 'all' || a.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (a.brand && a.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (a.model && a.model.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '24px' }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>115 Hodson Lab Portal</h1>
            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: notionConnected ? '1px solid #059669' : '1px solid #d97706', backgroundColor: notionConnected ? '#064e3b' : '#78350f', color: notionConnected ? '#34d399' : '#fde68a' }}>
              {notionConnected ? 'Live Notion Sync' : 'Default Asset Mode'}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Multi-Asset Reservation Portal for Microscopes, Scales, Sinks, Ovens, & Seats
          </p>
        </div>

        <button 
          onClick={() => setIsAdminMode(!isAdminMode)}
          style={{ padding: '8px 16px', backgroundColor: isAdminMode ? '#78350f' : '#1e293b', color: isAdminMode ? '#fde68a' : '#cbd5e1', border: '1px solid #475569', cursor: 'pointer', borderRadius: '8px', fontSize: '14px' }}
        >
          {isAdminMode ? 'Exit Admin Mode' : 'Admin & Photo Editor'}
        </button>
      </header>

      {!notionConnected && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 16px auto', padding: '12px 16px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
          <strong>Sync Status:</strong> {notionStatusMsg}
        </div>
      )}

      <main style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Sorted Asset Tile Grid */}
        <section>
          <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
            <input 
              type="text"
              placeholder="Search equipment, station, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '260px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc' }}
            />

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {dynamicCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeCategory === cat ? '#2563eb' : '#0f172a',
                    color: '#ffffff',
                    fontWeight: activeCategory === cat ? 'bold' : 'normal',
                    textTransform: 'capitalize'
                  }}
                >
                  {cat === 'all' ? 'All Equipment' : cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
            <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
              
              <span style={{ color: '#38bdf8', textTransform: 'none' }}>Click tiles to select multiple assets</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssets.some((a) => a.id === asset.id);
                return (
                  <div
                    key={asset.id}
                    onClick={() => toggleAssetSelection(asset)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #1e293b',
                      backgroundColor: isSelected ? '#172554' : '#0f172a',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    {isSelected && (
                      <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                        ✓
                      </span>
                    )}

                    {asset.imageUrl ? (
                      <img src={asset.imageUrl} alt={asset.name} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '90px', backgroundColor: '#020617', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#475569', textTransform: 'uppercase' }}>
                        {asset.category}
                      </div>
                    )}

                    <div style={{ fontWeight: '600', fontSize: '15px', color: '#f8fafc' }}>{asset.name}</div>
                    {(asset.brand || asset.model) && (
                      <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>{[asset.brand, asset.model].filter(Boolean).join(' · ')}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>📍 Station: {asset.location}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Multi-Asset Reservation & Admin Panel */}
        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', height: 'fit-content' }}>
          {isAdminMode ? (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '16px' }}>Admin & Photo Editor</h2>
              {selectedAssets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedAssets.map((asset) => (
                    <div key={asset.id} style={{ borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#60a5fa' }}>{asset.name}</div>
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
                        {(asset.category.toLowerCase().includes('scope') || asset.category.toLowerCase().includes('scale') || asset.category.toLowerCase().includes('balance')) && (
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
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>Select items from the grid to edit their details or upload photos.</p>
              )}
            </div>
          ) : (
            <div>
              {selectedAssets.length > 0 ? (
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                    Selected ({selectedAssets.length}) Asset(s)
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {selectedAssets.map((asset) => (
                      <div key={asset.id} style={{ padding: '10px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{asset.name}</div>
                        {(asset.brand || asset.model) && (
                          <div style={{ fontSize: '11px', color: '#93c5fd' }}>{[asset.brand, asset.model].filter(Boolean).join(' · ')}</div>
                        )}
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>📍 Station: {asset.location}</div>
                        {(asset.category.toLowerCase().includes('scope') || asset.category.toLowerCase().includes('scale') || asset.category.toLowerCase().includes('balance')) && (
                          <a href={asset.notionUrl || 'https://notion.so'} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'underline', marginTop: '4px', display: 'inline-block' }}>
                            

                  {bookingSuccess ? (
                    <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '8px' }}>Reservations Prepared!</div>
                      <p style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>
                        Click below to add events to 115 Hodson Lab Time Calendar:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {generatedCalendarLinks.map((link, idx) => (
                          <a key={idx} href={link.url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', backgroundColor: '#059669', color: '#fff', padding: '10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>
                            Add {link.assetName} to Calendar
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Start Date</label>
                          <input type="date" required value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endDate || endDate < e.target.value) setEndDate(e.target.value); }} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>End Date</label>
                          <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Start Time</label>
                          <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>End Time</label>
                          <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Researcher Name</label>
                        <input type="text" required placeholder="Jane Doe" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Researcher Email</label>
                        <input type="email" required placeholder="jane@university.edu" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Usage / Project Notes</label>
                        <textarea rows={2} placeholder="Protocol details or sample prep notes..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                      </div>

                      <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>
                        Reserve Selected ({selectedAssets.length}) Asset(s)
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                  Click tiles in the grid to select one or more seats or equipment to reserve.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}