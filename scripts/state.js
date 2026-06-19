// state.js


import { loadRecords, saveRecords, loadSettings, saveSettings, generateId } from './storage.js';

class AppState {
    constructor() {
        // Load saved data from localStorage when the app starts
        this.records  = loadRecords();
        this.settings = loadSettings();

        // UI state — tracks what the user is currently doing
        this.currentSection        = 'dashboard'; 
        this.editingRecordId       = null;         
        this.sortField             = 'date';      
        this.sortDesc              = true;        
        this.searchPattern         = '';         
        this.searchCaseInsensitive = true;         
        this.deleteConfirmingId    = null;         

        this._listeners = new Set(); 
    }

    // Register a listener. Returns a function to remove it later.
    subscribe(listenerFn) {
        this._listeners.add(listenerFn);
        return function unsubscribe() {
            this._listeners.delete(listenerFn);
        }.bind(this);
    }

    // Fire all listeners with the event type and changed data.
    _notify(type, payload) {
        this._listeners.forEach(function(listenerFn) {
            listenerFn({ type: type, payload: payload });
        });
    }

    //Records 

    // Add a new transaction. Assigns an ID and timestamps automatically.
    addRecord(data) {
        const record = {
            id:          generateId(),
            description: data.description,
            amount:      parseFloat(data.amount),
            category:    data.category,
            date:        data.date,
            createdAt:   new Date().toISOString(),
            updatedAt:   new Date().toISOString()
        };
        this.records.push(record);
        saveRecords(this.records);
        this._notify('record:added', record);
        return record;
    }

    // Update an existing transaction by its ID.
    updateRecord(id, data) {
        const record = this.records.find(function(r) { return r.id === id; });
        if (!record) return null; // record not found

        record.description = data.description;
        record.amount      = parseFloat(data.amount);
        record.category    = data.category;
        record.date        = data.date;
        record.updatedAt   = new Date().toISOString();

        saveRecords(this.records);
        this._notify('record:updated', record);
        return record;
    }

    // Remove a transaction by its ID.
    deleteRecord(id) {
        const index = this.records.findIndex(function(r) { return r.id === id; });
        if (index === -1) return false; // record not found

        this.records.splice(index, 1); // remove 1 item at that index
        saveRecords(this.records);
        this._notify('record:deleted', { id: id });
        return true;
    }

    // Replace all records at once (used when importing from a file).
    setRecords(records) {
        this.records = records;
        saveRecords(this.records);
        this._notify('records:bulk-update', records);
    }

    // Remove all transaction records.
    clearRecords() {
        this.records = [];
        saveRecords(this.records);
        this._notify('records:cleared', null);
    }

    //Settings

    // Merge new settings values into the existing settings and save.
    updateSettings(updates) {
        this.settings = Object.assign({}, this.settings, updates, {
            lastUpdated: new Date().toISOString()
        });
        saveSettings(this.settings);
        this._notify('settings:updated', this.settings);
    }

    //UI state setters
    // Each setter saves the new value and notifies subscribers so the UI can react.

    setCurrentSection(section) {
        this.currentSection = section;
        this._notify('ui:section-changed', section);
    }

    setEditingRecordId(id) {
        this.editingRecordId = id;
        this._notify('ui:editing-changed', id);
    }

    setSortField(field) {
        this.sortField = field;
        this._notify('ui:sort-changed', field);
    }

    setSortDesc(desc) {
        this.sortDesc = desc;
        this._notify('ui:sort-desc-changed', desc);
    }

    setSearchPattern(pattern) {
        this.searchPattern = pattern;
        this._notify('ui:search-changed', pattern);
    }

    setSearchCaseInsensitive(value) {
        this.searchCaseInsensitive = value;
        this._notify('ui:search-flags-changed', value);
    }

    setDeleteConfirmingId(id) {
        this.deleteConfirmingId = id;
        this._notify('ui:delete-confirming-changed', id);
    }
}

// Export a single shared instance — every module imports the same state object
export default new AppState();
