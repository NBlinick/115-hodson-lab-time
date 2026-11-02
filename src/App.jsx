import React, { useState, useEffect } from 'react';

// Google Calendar ID for 115 Hodson Lab Time
const GCAL_TARGET_ID = "umn.edu_utg0nurqmmirg5udgvi2dim1gs@group.calendar.google.com";

const DEFAULT_LAB_ASSETS = [
  { id: 'scope-1', name: 'Leica EZ4 W Microscope', brand: 'Leica', model: 'EZ4 W', category: 'microscope', location: 'Station 1A', status: 'available', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'scale-1', name: 'Mettler Toledo Scale', brand: 'Mettler Toledo', model: 'ME204T', category: 'scale', location: 'Weighing Bay 1', status: 'available', notionUrl: 'https://notion.so', imageUrl: '' },
  { id: 'seat-1', name: 'Bench Seat 1A', brand: 'Labconco', model: 'Standard Ergonomic', category: 'seat', location: 'Row 1', status: 'available', notionUrl: '', imageUrl: '' },
  { id: 'oven-1', name: 'IsoTemp Drying Oven', brand: 'Fisher Scientific', model: 'IsoTemp 280A', category: 'oven', location: 'Back Wall Bay', status: 'available', notionUrl: '', imageUrl: '' },
  { id: 'sink-1', name: 'Decontamination Sink', brand: 'Justrite', model: 'Stainless Wet Sink', category: 'sink', location: 'North Wall', status: 'available', notionUrl: '', imageUrl: '' }
];

const HIERARCHY_ORDER = ['microscope', 'scale', 'seat', 'oven', 'sink'];

export default function App() {
  const [assets, setAssets] = useState(DEFAULT_LAB_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionStatusMsg, setNotionStatusMsg] = useState('Checking Notion sync...');

  // Booking Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
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
          const filteredResults = data.results.filter((page) => {
            const props = page.properties || {};
            // Filter by "App Target" column (matches "Hodson App" or "Hodson Lab")
            const targetVal = (props['App Target']?.select?.name || props['App Target']?.rich_text?.[0]?.plain_text || '').toLowerCase();
            return !targetVal || targetVal.includes('hodson');
          });

          const parsed = filteredResults.map((page) => {
            const props = page.properties || {};
            
            let name = 'Unnamed Asset';
            const nameProp = props['Asset Name'] || props['Name'];
            if (nameProp?.title?.[0]?.plain_text) {
              name = nameProp.title[0].plain_text;
            }

            let photoUrl = '';
            const photoKey = Object.keys(props).find(k => k.toLowerCase() === 'photo' || k.toLowerCase() === 'image');
            if (photoKey && props[photoKey]?.files?.[0]) {
              const fileObj = props[photoKey].files[0];
              photoUrl = fileObj.file?.url || fileObj.external?.url || '';
            }

            const rawCat = (props['Category']?.select?.name || props['Category']?.rich_text?.[0]?.plain_text || 'seat').toLowerCase();
            let category = 'seat';
            if (rawCat.includes('scope') || rawCat.includes('microscope')) category = 'microscope';
            else if (rawCat.includes('scale') || rawCat.includes('balance')) category = 'scale';
            else if (rawCat.includes('oven')) category = 'oven';
            else if (rawCat.includes('sink')) category = 'sink';

            const brand = props['Brand']?.rich_text?.[0]?.plain_text || props['Brand']?.select?.name || '';
            const model = props['Model']?.rich_text?.[0]?.plain_text || props['Model']?.select?.name || '';
            const location = props['Location']?.select?.name || props['Location']?.rich_text?.[0]?.plain_text || 'Room 115';

            return {
              id: page.id,
              name: name,
              brand: brand,
              model: model,
              category: category,
              location: location,
              status: 'available',
              notionUrl: page.url,
              imageUrl: photoUrl
            };
          });

          // Sort by category hierarchy: Microscope -> Scale -> Seat -> Oven -> Sink
          parsed.sort((a, b) => HIERARCHY_ORDER.indexOf(a.category) - HIERARCHY_ORDER.indexOf(b.category));

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

  const filteredAssets = assets.filter((item) => {
    const matchesFilter = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.model && item.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    const finalEndDate = endDate || startDate;
    const startISO = `${startDate.replace(/-/g, '')}T${startTime.replace(':', '')}00`;
    const endISO = `${finalEndDate.replace(/-/g, '')}T${endTime.replace(':', '')}00`;

    const title = encodeURIComponent(`Reservation: ${selectedAsset.name}${selectedAsset.model ? ` (${selectedAsset.model})` : ''}`);
    const details = encodeURIComponent(
      `Reserved by: ${userName} (${userEmail})\nEquipment: ${selectedAsset.name}\nBrand & Model: ${selectedAsset.brand || 'N/A'} ${selectedAsset.model || ''}\nLocation: Room 115 - ${selectedAsset.location}\nDuration: ${startDate} ${startTime} to ${finalEndDate} ${endTime}\nNotes: ${notes}\nNotion Log: ${selectedAsset.notionUrl || 'N/A'}`
    );
    const location = encodeURIComponent(`115 Hodson Lab - Station: ${selectedAsset.location}`);

    const gCalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&src=${encodeURIComponent(GCAL_TARGET_ID)}&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}&ctz=America%2FChicago`;

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
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>115 Hodson Lab Reservation Portal</h1>
            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: notionConnected ? '1px solid #059669' : '1px solid #d97706', backgroundColor: notionConnected ? '#064e3b' : '#78350f', color: notionConnected ? '#34d399' : '#fde68a' }}>
              {notionConnected ? 'Live Notion Sync' : 'Default Mode'}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Reserve Microscopes, Scales, Seats, Drying Ovens, & Sinks in Room 115
          </p>
        </div>

        <button 
          onClick={() => setIsAdminMode(!isAdminMode)}
          style={{ padding: '8px 16px', backgroundColor: isAdminMode ? '#78350f' : '#1e293b', color: isAdminMode ? '#fde68a' : '#cbd5e1', border: '1px solid #475569', cursor: 'pointer', borderRadius: '8px', fontSize: '14px' }}
        >
          {isAdminMode ? 'Exit Admin Mode' : 'Admin Editor'}
        </button>
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
              placeholder="Search equipment, brand, model, or station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '280px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc' }}
            />

            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'microscope', 'scale', 'seat', 'oven', 'sink'].map((cat) => (
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
                  {cat === 'all' ? 'All Assets' : cat + 's'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
            <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Room 115 Lab Equipment & Seats
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {filteredAssets.map((item) => {
                const isSelected = selectedAsset?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedAsset(item); setBookingSuccess(false); }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid #1e293b',
                      backgroundColor: isSelected ? '#172554' : '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                    ) : (
                      <div style={{ width: '100%', height: '80px', backgroundColor: '#020617', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#475569', textTransform: 'uppercase' }}>
                        {item.category}
                      </div>
                    )}

                    <div style={{ fontWeight: '600', fontSize: '15px', color: '#f8fafc' }}>{item.name}</div>
                    {(item.brand || item.model) && (
                      <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>{[item.brand, item.model].filter(Boolean).join(' · ')}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>📍 Station: {item.location}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', height: 'fit-content' }}>
          {isAdminMode ? (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '16px' }}>Admin Equipment & Photo Editor</h2>
              {selectedAsset ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Brand / Make</label>
                    <input type="text" value={selectedAsset.brand || ''} onChange={(e) => handleAssetUpdate(selectedAsset.id, 'brand', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Model</label>
                    <input type="text" value={selectedAsset.model || ''} onChange={(e) => handleAssetUpdate(selectedAsset.id, 'model', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Image URL</label>
                    <input type="text" placeholder="https://..." value={selectedAsset.imageUrl || ''} onChange={(e) => handleAssetUpdate(selectedAsset.id, 'imageUrl', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                  </div>
                  {(selectedAsset.category === 'microscope' || selectedAsset.category === 'scale') && (
                    <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Admin Notion Maintenance Record:</div>
                      <a href={selectedAsset.notionUrl || 'https://notion.so'} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'underline', wordBreak: 'break-all' }}>
                        {selectedAsset.notionUrl || 'View in Notion'}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>Select an asset from the grid to edit specs and images.</p>
              )}
            </div>
          ) : (
            <div>
              {selectedAsset ? (
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{selectedAsset.name}</h2>
                  {(selectedAsset.brand || selectedAsset.model) && (
                    <div style={{ fontSize: '12px', color: '#93c5fd', margin: '0 0 4px 0' }}>{[selectedAsset.brand, selectedAsset.model].filter(Boolean).join(' · ')}</div>
                  )}
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0' }}>📍 Station: {selectedAsset.location}</p>

                  {bookingSuccess ? (
                    <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '8px' }}>Reservation Prepared!</div>
                      <a href={calendarUrl} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', backgroundColor: '#059669', color: '#fff', padding: '10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
                        Add to 115 Hodson Lab Time Calendar
                      </a>
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
                        <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Email</label>
                        <input type="email" required placeholder="jane@university.edu" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Project / Usage Notes</label>
                        <textarea rows={2} placeholder="Sample preparation and protocol notes..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                      </div>

                      <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                        Reserve Equipment Slot
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                  Select an asset from the grid to schedule.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}