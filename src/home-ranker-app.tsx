// Home Ranker 6 - Main Application
// Simplified version with customer creation

import { useState, useEffect } from 'react';
import { Plus, Trash2, LogOut, UserPlus, Copy, Check } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  labels: string[];
};

type House = {
  id: string;
  address: string;
  ratings: Record<string, number>;
  notes: string;
  photos: string[];
  daysOnMarket?: number;
};

type Property = {
  id: string;
  address: string;
  daysOnMarket?: number;
  notes?: string;
  photos: string[];
};

const presetCategories: Category[] = [
  { id: 'parking', name: 'Parking', labels: ['No parking', 'Street only', '1-car garage', '2-car garage', '2-car + camper'] },
  { id: 'bedrooms', name: 'Bedrooms', labels: ['Cramped', 'Small', 'Average', 'Spacious', 'Huge'] },
  { id: 'kitchen', name: 'Kitchen', labels: ['Needs work', 'Dated', 'Functional', 'Modern', "Chef's dream"] },
  { id: 'location', name: 'Location', labels: ['Remote', 'Far from amenities', 'Average', 'Good access', 'Perfect'] },
  { id: 'yard', name: 'Yard', labels: ['None', 'Tiny', 'Average', 'Large', 'Estate'] }
];

export default function HomeRankerApp() {
  const [userType, setUserType] = useState<'agent' | 'customer' | null>(null);
  const [agentEmail, setAgentEmail] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [categories, setCategories] = useState<Category[]>(presetCategories);
  const [currentHouseId, setCurrentHouseId] = useState<string | null>(null);
  const [newCustomerId, setNewCustomerId] = useState<string | null>(null);
  const [showCustomerLink, setShowCustomerLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newPropertyAddress, setNewPropertyAddress] = useState('');
  const [newPropertyDays, setNewPropertyDays] = useState('');
  const [newPropertyNotes, setNewPropertyNotes] = useState('');
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [agentPropertiesForCustomer, setAgentPropertiesForCustomer] = useState<Property[]>([]);
  const [isAddingHouse, setIsAddingHouse] = useState(false);
  
  
  
  
  
  
  
  

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCustomerId = params.get('customer');
    if (urlCustomerId) {
      setCustomerId(urlCustomerId);
      fetchCustomerData(urlCustomerId);
    }
  }, []);

  const fetchCustomerData = async (cid: string) => {
    const res = await fetch(`/api/customer/${cid}`);
    if (res.ok) {
      const data = await res.json();
      console.log("[DEBUG] Response:", data);
      const resolvedCategories = data.categories?.length > 0 ? data.categories : presetCategories;
      setCategories(resolvedCategories);
      setHouses(data.houses || []);
      if (data.houses?.length > 0) setCurrentHouseId(data.houses[0].id);
      // Load agent's properties for customer to choose from
      if (data.agentId) {
        const propsRes = await fetch(`/api/agent/${data.agentId}/properties`);
        const propsData = await propsRes.json();
        setAgentPropertiesForCustomer(propsData.properties || []);
        if ((!data.houses || data.houses.length === 0) && propsData.properties?.length > 0) {
          const defaultHouses: House[] = propsData.properties.map((p: Property) => ({
            id: crypto.randomUUID(),
            address: p.address,
            ratings: {},
            notes: p.notes || '',
            photos: p.photos || [],
            daysOnMarket: p.daysOnMarket
          }));
          setHouses(defaultHouses);
          await fetch(`/api/customer/${cid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ houses: defaultHouses, categories: resolvedCategories, agentId: data.agentId })
          });
        }
      }
      setUserType('customer');
    }
  };

  const loginAsAgent = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    
    try {
      console.log("[DEBUG] Login clicked for:", agentEmail);
      
      // Try to login first
      const res = await fetch('/api/agent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: agentEmail })
      });
      
      const data = await res.json();
      console.log("[DEBUG] Login response:", data);
      
      if (data.agentId) {
        setAgentId(data.agentId);
        setUserType('agent');
        await loadAgentProperties(data.agentId);
        return;
      }
      
      // If not found, create new agent
      console.log("[DEBUG] Agent not found, creating new...");
      const createRes = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: agentEmail })
      });
      
      const createData = await createRes.json();
      console.log("[DEBUG] Create response:", createData);
      
      if (createData.agentId) {
        setAgentId(createData.agentId);
        setUserType('agent');
        await loadAgentProperties(createData.agentId);
      } else {
        setLoginError(createData.error || 'Failed to create agent');
      }
    } catch (err) {
      console.error("[DEBUG] Login error:", err);
      setLoginError('Network error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginAsCustomer = async () => {
    if (!customerId.trim()) return;
    setLoginError(null);
    setIsLoggingIn(true);
    
    try {
      // Look up customer by email
      const res = await fetch('/api/customer/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerId })
      });
      
      const data = await res.json();
      console.log("[DEBUG] Customer lookup:", data);
      
      if (data.customerId) {
        await fetchCustomerData(data.customerId);
      } else {
        setLoginError(data.error || 'Failed to find customer');
      }
    } catch (err) {
      console.error("[DEBUG] Login error:", err);
      setLoginError('Network error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadAgentProperties = async (id: string) => {
    const res = await fetch(`/api/agent/${id}/properties`);
    const data = await res.json();
      console.log("[DEBUG] Response:", data);
    setProperties(data.properties || []);
  };

  const addProperty = async () => {
    if (!agentId || !newPropertyAddress.trim()) return;
    setIsAddingProperty(true);
    try {
      const res = await fetch(`/api/agent/${agentId}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: newPropertyAddress,
          daysOnMarket: newPropertyDays ? parseInt(newPropertyDays) : null,
          notes: newPropertyNotes,
          photos: []
        })
      });
      const data = await res.json();
      if (data.propertyId) {
        setProperties([...properties, {
          id: data.propertyId,
          address: newPropertyAddress,
          daysOnMarket: newPropertyDays ? parseInt(newPropertyDays) : undefined,
          notes: newPropertyNotes,
          photos: []
        }]);
        setNewPropertyAddress('');
        setNewPropertyDays('');
        setNewPropertyNotes('');
        setShowAddProperty(false);
      }
    } catch (err) {
      console.error('Failed to add property:', err);
    } finally {
      setIsAddingProperty(false);
    }
  };

  const createCustomer = async () => {
    if (!agentId || !newCustomerEmail.trim()) return;
    
    const res = await fetch(`/api/agent/${agentId}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newCustomerEmail })
    });
    const data = await res.json();
    console.log("[DEBUG] Response:", data);
    if (data.customerId) {
      setNewCustomerId(data.customerId);
      setShowCustomerLink(true);
      setNewCustomerEmail('');
      setShowCreateCustomer(false);
    }
  };

  const copyLink = () => {
    if (!newCustomerId) return;
    const link = `${window.location.origin}?customer=${newCustomerId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addHouseFromProperty = async (property: Property) => {
    setIsAddingHouse(true);
    try {
      const newHouse: House = {
        id: crypto.randomUUID(),
        address: property.address,
        ratings: {},
        notes: '',
        photos: property.photos || [],
        daysOnMarket: property.daysOnMarket
      };
      const updatedHouses = [...houses, newHouse];
      setHouses(updatedHouses);
      // Save to server
      await fetch(`/api/customer/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houses: updatedHouses, categories })
      });
    } catch (err) {
      console.error('Failed to add house:', err);
    } finally {
      setIsAddingHouse(false);
    }
  };

  // Auth Screen
  if (!userType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">Home Ranker 6</h1>
          <p className="text-slate-600 text-center mb-6">Property Comparison Tool</p>
          
          <div className="space-y-6">
            {/* Agent Login */}
            <div className="bg-blue-50 rounded-xl p-4">
              <label htmlFor="agentEmail" className="block font-semibold text-blue-800 mb-3">Agent Login</label>
              <input
                type="email" id="agentEmail" name="agentEmail"
                value={agentEmail}
                onChange={e => setAgentEmail(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg mb-2"
                placeholder="agent@example.com"
              />
              {loginError && (
                <p className="text-red-600 text-sm mb-2">{loginError}</p>
              )}
              <button 
                onClick={loginAsAgent} 
                disabled={isLoggingIn}
                className="w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoggingIn ? 'Logging in...' : 'Login as Agent'}
              </button>
              <p className="text-xs text-slate-500 mt-2">
                New agents are automatically registered
              </p>
            </div>
            
            {/* Customer Login */}
            <div className="bg-green-50 rounded-xl p-4">
              <label htmlFor="customerEmail" className="block font-semibold text-green-800 mb-3">Customer Access</label>
              <input
                type="email" id="customerEmail" name="customerEmail"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg mb-2"
                placeholder="your@email.com"
              />
              <button onClick={loginAsCustomer} className="w-full p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Access My Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Agent Dashboard
  if (userType === 'agent') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Agent Dashboard</h1>
              <p className="text-slate-600">{agentEmail}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowAddProperty(!showAddProperty)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                {showAddProperty ? 'Cancel' : 'Add Property'}
              </button>
              <button 
                onClick={() => setShowCreateCustomer(true)} 
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <UserPlus className="w-4 h-4" />
                Create Customer
              </button>
              <button onClick={() => setUserType(null)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Create Customer Form */}
          {showCreateCustomer && (
            <div className="bg-green-50 border border-green-200 rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4">Create New Customer</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-slate-700 mb-1">Customer Email *</label>
                  <input
                    id="customerEmail"
                    type="email"
                    value={newCustomerEmail}
                    onChange={e => setNewCustomerEmail(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createCustomer}
                    disabled={!newCustomerEmail.trim()}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Create & Show Link
                  </button>
                  <button
                    onClick={() => { setShowCreateCustomer(false); setNewCustomerEmail(''); }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Property Form */}
          {showAddProperty && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Add New Property</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="propAddress" className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
                  <input
                    id="propAddress"
                    type="text"
                    value={newPropertyAddress}
                    onChange={e => setNewPropertyAddress(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                    placeholder="123 Main St, City, State"
                  />
                </div>
                <div>
                  <label htmlFor="propDays" className="block text-sm font-medium text-slate-700 mb-1">Days on Market</label>
                  <input
                    id="propDays"
                    type="number"
                    value={newPropertyDays}
                    onChange={e => setNewPropertyDays(e.target.value)}
                    className="w-32 p-3 border border-slate-200 rounded-lg"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="propNotes" className="block text-sm font-medium text-slate-700 mb-1">Your Private Notes</label>
                  <textarea
                    id="propNotes"
                    value={newPropertyNotes}
                    onChange={e => setNewPropertyNotes(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg h-24"
                    placeholder="Notes only you can see..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addProperty}
                    disabled={isAddingProperty || !newPropertyAddress.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAddingProperty ? 'Adding...' : 'Add Property'}
                  </button>
                  <button
                    onClick={() => setShowAddProperty(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Customer Link Display */}
          {showCustomerLink && newCustomerId && (
            <div className="bg-green-50 border border-green-200 rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Customer Portal Created!</h3>
              <p className="text-sm text-green-700 mb-3">Share this link with your customer:</p>
              <div className="bg-white p-3 rounded border border-green-300 font-mono text-sm break-all">
                {window.location.origin}?customer={newCustomerId}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => setShowCustomerLink(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">My Properties ({properties.length})</h2>
              <button 
                onClick={() => setShowAddProperty(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> Add Property
              </button>
            </div>
            
            {/* Add Property Form */}
            {showAddProperty && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-4">
                <h3 className="font-semibold text-slate-800 mb-3">Add New Property</h3>
                <input
                  type="text"
                  value={newPropertyAddress}
                  onChange={e => setNewPropertyAddress(e.target.value)}
                  placeholder="Property address..."
                  className="w-full p-3 border border-slate-200 rounded-lg mb-2"
                />
                <input
                  type="number"
                  value={newPropertyDays}
                  onChange={e => setNewPropertyDays(e.target.value)}
                  placeholder="Days on market (optional)"
                  className="w-full p-3 border border-slate-200 rounded-lg mb-2"
                />
                <textarea
                  value={newPropertyNotes}
                  onChange={e => setNewPropertyNotes(e.target.value)}
                  placeholder="Your private notes about this property..."
                  className="w-full p-3 border border-slate-200 rounded-lg mb-3 h-24 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addProperty}
                    disabled={isAddingProperty || !newPropertyAddress.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAddingProperty ? 'Adding...' : 'Add Property'}
                  </button>
                  <button
                    onClick={() => setShowAddProperty(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              {properties.length === 0 && (
                <p className="text-slate-500">No properties yet. Add your first property.</p>
              )}
              {properties.map(p => (
                <div key={p.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="font-medium">{p.address}</div>
                  {p.daysOnMarket && <div className="text-sm text-slate-500">{p.daysOnMarket} days on market</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Customer Workspace (with agent's shared properties)
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Home Ranker</h1>
            <p className="text-sm text-slate-500">Your workspace</p>
          </div>
          <button onClick={() => setUserType(null)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        {/* Agent's shared properties - customer can add to their workspace */}
        {agentPropertiesForCustomer.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Properties to Rank ({agentPropertiesForCustomer.length})</h2>
            <p className="text-sm text-slate-500 mb-4">Tap a property to add it to your ranking workspace</p>
            <div className="space-y-2">
              {agentPropertiesForCustomer.map((p) => {
                const alreadyAdded = houses.some(h => h.address === p.address);
                return (
                  <div 
                    key={p.id} 
                    onClick={() => !alreadyAdded && addHouseFromProperty(p)}
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      alreadyAdded 
                        ? 'border-green-300 bg-green-50 cursor-default' 
                        : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <div className="font-medium">{p.address}</div>
                    {p.daysOnMarket && <div className="text-sm text-slate-500">{p.daysOnMarket} days on market</div>}
                    {alreadyAdded && <div className="text-sm text-green-600 font-medium mt-1">✓ Added to your workspace</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Customer's ranking workspace */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">My Properties to Rank ({houses.length})</h2>
          {houses.length === 0 ? (
            <p className="text-slate-500">No properties added yet. Tap a property above to add it.</p>
          ) : (
            <div className="space-y-2">
              {houses.map(h => (
                <div key={h.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="font-medium">{h.address}</div>
                  <div className="text-sm text-slate-500">
                    Score: {Object.values(h.ratings).reduce((a, b) => a + b, 0)}/{categories.length * 5}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
