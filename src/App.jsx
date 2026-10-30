cat << 'EOF' > src/App.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, Mail, FileText, CheckCircle2, 
  ExternalLink, Settings, Search, AlertTriangle, Wrench, Tag, Info
} from 'lucide-react';

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
  { id: 'hood-01', name: 'Fume Hood Station 1', brand: 'Labconco', model: 'Protector XStream', type: 'fume_hood', location: 'East Wall', status: 'available', notionUrl: '', imageUrl: '' },
  { id: 'centrifuge-01', name: 'Benchtop Refrigerated Centrifuge', brand: 'Eppendorf', model: '5424 R', type: 'centrifuge', location: 'Prep Area', status: 'available', notionUrl: '', imageUrl: '' }
];

export default function App() {
  const [assets, setAssets] = useState(DEFAULT_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionErrorMsg, setNotionErrorMsg] = useState('');

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
    async function loadNotionData() {
      try {
        const res = await fetch('/api/notion');
        const data = await res.json();

        if (res.ok) {
          if (data.results && data.results.length > 0) {
            const parsed = data.results.map((page) => {
              const props = page.properties || {};
              
              let name = 'Unnamed Asset';
              Object.keys(props).forEach((key) => {
                if (props[key]?.type === 'title' && props[key]?.title?.[0]?.plain_text) {
                  name = props[key].title[0].plain_text;
                }
              });

              let photoUrl = '';
              const photoPropKey = Object.keys(props).find(k => k.toLowerCase() === 'photo' || k.toLowerCase() === 'image');
              if (photoPropKey && props[photoPropKey]?.files?.[0]) {
                const fileObj = props[photoPropKey].files[0];
                if (fileObj.type === 'file') photoUrl = fileObj.file?.url || '';
                else if (fileObj.type === 'external') photoUrl = fileObj.external?.url || '';
              }

              const category = props['Category']?.select?.name?.toLowerCase() || props['Type']?.select?.name?.toLowerCase() || 'seat';
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
            setNotionErrorMsg('');
          }
        } else {
          setNotionErrorMsg(data.message || `Notion API Error (${res.status})`);
        }
      } catch (err) {
        setNotionErrorMsg('Displaying local assets.');
      }
    }
    loadNotionData();
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
      `Reserved by: ${userName} (${userEmail})\nEquipment: ${selectedAsset.name}\nBrand & Model: ${selectedAsset.brand || 'N/A'} ${selectedAsset.model || ''}\nLocation: ${selectedAsset.location}\nCheckout Duration: ${startDate} to ${finalEndDate}\nProject Notes: ${notes}\nNotion Maintenance Records: ${selectedAsset.notionUrl || 'N/A'}`
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-8">
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white tracking-tight">115 Hodson Lab Time</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              notionConnected 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {notionConnected ? 'Notion Connected' : 'Local Fallback Mode'}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Visual 2D Floor Plan & Multi-Day Reservation Portal for Seats, Microscopes, Scales, Sinks, and Wet Bays
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a 
            href={CALENDAR_EMBED_URL}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-blue-400" /> Live UMN Calendar
          </a>

          <button 
            onClick={() => setIsAdminMode(!isAdminMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 border ${
              isAdminMode 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            {isAdminMode ? 'Exit Admin Mode' : 'Admin & Photo Editor'}
          </button>
        </div>
      </header>

      {notionErrorMsg && !notionConnected && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">Notion Status:</span> {notionErrorMsg}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                id="search-equipment-input"
                name="searchEquipment"
                type="text"
                placeholder="Search equipment, brand, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-1 w-full sm:w-auto">
              {['all', 'seat', 'microscope', 'scale', 'sink'].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                    activeFilter === type 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'scale' ? 'Weighing Scales' : type + 's'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 relative min-h-[500px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-6">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                Floor Plan Blueprint - Room 115 Hodson
              </span>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Selected</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                const isNotionLinked = asset.type === 'microscope' || asset.type === 'scale';

                return (
                  <div
                    key={asset.id}
                    onClick={() => { setSelectedAsset(asset); setBookingSuccess(false); }}
                    className={`group relative p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-500/10' 
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      {asset.imageUrl ? (
                        <img 
                          src={asset.imageUrl} 
                          alt={asset.name} 
                          className="w-full h-24 object-cover rounded-lg mb-3 border border-slate-800"
                        />
                      ) : (
                        <div className="w-full h-20 bg-slate-950/80 rounded-lg mb-3 flex items-center justify-center border border-slate-800/80">
                          <span className="text-slate-600 text-xs uppercase font-mono">{asset.type}</span>
                        </div>
                      )}

                      <h3 className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 transition">
                        {asset.name}
                      </h3>
                      
                      {(asset.brand || asset.model) && (
                        <p className="text-[11px] font-mono text-blue-300 mt-1 flex items-center gap-1">
                          <Tag className="w-3 h-3 shrink-0" />
                          <span>{[asset.brand, asset.model].filter(Boolean).join(' · ')}</span>
                        </p>
                      )}

                      <p className="text-xs text-slate-400 mt-1">{asset.location}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-medium">Available</span>
                      {isNotionLinked && (
                        <span className="text-slate-500 flex items-center gap-1 text-[10px]" title="Linked to Notion Maintenance Log">
                          <ExternalLink className="w-3 h-3" /> Notion Log
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 h-fit sticky top-8">
          {isAdminMode ? (
            <div className="space-y-6">
              <div className="border-b border-slate-700 pb-4">
                <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <Wrench className="w-5 h-5" /> Admin Asset & Photo Editor
                </h2>
              </div>

              {selectedAsset ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="admin-asset-name" className="block text-xs font-semibold text-slate-300 mb-1">Equipment Name</label>
                    <input 
                      id="admin-asset-name"
                      name="adminAssetName"
                      type="text"
                      value={selectedAsset.name}
                      onChange={(e) => handleAssetUpdate(selectedAsset.id, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="admin-asset-brand" className="block text-xs font-semibold text-slate-300 mb-1">Brand</label>
                      <input 
                        id="admin-asset-brand"
                        name="adminAssetBrand"
                        type="text"
                        value={selectedAsset.brand || ''}
                        onChange={(e) => handleAssetUpdate(selectedAsset.id, 'brand', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label htmlFor="admin-asset-model" className="block text-xs font-semibold text-slate-300 mb-1">Model</label>
                      <input 
                        id="admin-asset-model"
                        name="adminAssetModel"
                        type="text"
                        value={selectedAsset.model || ''}
                        onChange={(e) => handleAssetUpdate(selectedAsset.id, 'model', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin-asset-location" className="block text-xs font-semibold text-slate-300 mb-1">Location / Bench Station</label>
                    <input 
                      id="admin-asset-location"
                      name="adminAssetLocation"
                      type="text"
                      value={selectedAsset.location}
                      onChange={(e) => handleAssetUpdate(selectedAsset.id, 'location', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-asset-image" className="block text-xs font-semibold text-slate-300 mb-1">Image URL / Local Photo Link</label>
                    <input 
                      id="admin-asset-image"
                      name="adminAssetImage"
                      type="text"
                      placeholder="https://..."
                      value={selectedAsset.imageUrl || ''}
                      onChange={(e) => handleAssetUpdate(selectedAsset.id, 'imageUrl', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-asset-notion" className="block text-xs font-semibold text-slate-300 mb-1">Notion Maintenance Page URL</label>
                    <input 
                      id="admin-asset-notion"
                      name="adminAssetNotion"
                      type="text"
                      placeholder="https://notion.so/..."
                      value={selectedAsset.notionUrl || ''}
                      onChange={(e) => handleAssetUpdate(selectedAsset.id, 'notionUrl', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Select an asset on the floor plan map to edit its photo and details.</p>
              )}
            </div>
          ) : (
            <div>
              {selectedAsset ? (
                <div className="space-y-6">
                  <div>
                    <span className="text-xs font-mono uppercase text-blue-400 font-semibold">Reserve Station</span>
                    <h2 className="text-xl font-bold text-white mt-1">{selectedAsset.name}</h2>
                    
                    {(selectedAsset.brand || selectedAsset.model) && (
                      <p className="text-xs font-mono text-blue-300 mt-1">
                        {[selectedAsset.brand, selectedAsset.model].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 mt-1">{selectedAsset.location}</p>

                    {(selectedAsset.type === 'microscope' || selectedAsset.type === 'scale') && (
                      <div className="mt-4 p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl flex items-center justify-between">
                        <span className="text-xs text-slate-300 font-medium">Maintenance Log</span>
                        <a 
                          href={selectedAsset.notionUrl || 'https://notion.so'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                          View in Notion <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {bookingSuccess ? (
                    <div className="bg-emerald-950/60 border border-emerald-500/40 p-5 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                        <CheckCircle2 className="w-5 h-5" /> Reservation Details Prepared!
                      </div>
                      <p className="text-xs text-slate-300">
                        Click below to post this checkout directly to the <strong className="text-white">115 Hodson Lab Time</strong> Google Calendar:
                      </p>
                      <a 
                        href={calendarUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-center rounded-lg text-sm transition shadow-lg"
                      >
                        Add to 115 Hodson Lab Time Calendar
                      </a>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="start-date" className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                          <input 
                            id="start-date"
                            name="startDate"
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => {
                              setStartDate(e.target.value);
                              if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 [color-scheme:dark]"
                          />
                        </div>

                        <div>
                          <label htmlFor="end-date" className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                          <input 
                            id="end-date"
                            name="endDate"
                            type="date"
                            required
                            min={startDate}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="start-time" className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                          <input 
                            id="start-time"
                            name="startTime"
                            type="time"
                            required
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label htmlFor="end-time" className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                          <input 
                            id="end-time"
                            name="endTime"
                            type="time"
                            required
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="user-name" className="block text-xs font-semibold text-slate-300 mb-1">Researcher Name</label>
                        <input 
                          id="user-name"
                          name="userName"
                          type="text"
                          required
                          placeholder="Jane Doe"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                        />
                      </div>

                      <div>
                        <label htmlFor="user-email" className="block text-xs font-semibold text-slate-300 mb-1">Contact Email</label>
                        <input 
                          id="user-email"
                          name="userEmail"
                          type="email"
                          required
                          placeholder="jane@university.edu"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                        />
                      </div>

                      <div>
                        <label htmlFor="user-notes" className="block text-xs font-semibold text-slate-300 mb-1">Project Notes / Protocol</label>
                        <textarea 
                          id="user-notes"
                          name="userNotes"
                          rows={2}
                          placeholder="Brief description of research experiment..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                      >
                        <Calendar className="w-4 h-4" /> Reserve Multi-Day Block
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <Info className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-sm font-medium">Select any seat, microscope, scale, or sink on the floor plan to make a reservation.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
EOF