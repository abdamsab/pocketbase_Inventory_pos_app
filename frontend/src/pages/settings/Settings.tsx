import { useSettings, useUpdateSetting } from '../../hooks/useSettings';
import { Save, Building, Percent, DollarSign, MapPin, Phone, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Settings() {
    const { data: settings, isLoading } = useSettings();
    const updateSetting = useUpdateSetting();

    const [formData, setFormData] = useState({
        companyName: '',
        address: '',
        phone: '',
        email: '',
        taxRate: '0',
        currency: 'USD',
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (settings?.company_info) {
            setFormData({
                companyName: settings.company_info.name || '',
                address: settings.company_info.address || '',
                phone: settings.company_info.phone || '',
                email: settings.company_info.email || '',
                taxRate: ((settings.company_info.taxRate || 0) * 100).toString(),
                currency: settings.company_info.currency || 'USD',
            });
        }
    }, [settings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await updateSetting.mutateAsync({
                key: 'company_info',
                value: {
                    name: formData.companyName,
                    address: formData.address,
                    phone: formData.phone,
                    email: formData.email,
                    taxRate: parseFloat(formData.taxRate) / 100,
                    currency: formData.currency,
                }
            });

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings. Please try again.');
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-64 text-primary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-heading font-bold text-text-main">System Settings</h2>
                <p className="text-text-muted">Manage global application configuration</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl shadow-sm p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <Building size={16} />
                            Company Name
                        </label>
                        <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {/* Currency */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <DollarSign size={16} />
                            Currency Code
                        </label>
                        <input
                            type="text"
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <Phone size={16} />
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <Mail size={16} />
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {/* Tax Rate */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <Percent size={16} />
                            Tax Rate (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.taxRate}
                            onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        />
                    </div>

                    {/* Address */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-text-main flex items-center gap-2">
                            <MapPin size={16} />
                            Address
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows={3}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-text-main focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
                    {saved && (
                        <span className="text-secondary text-sm font-medium animate-fade-in">
                            Settings saved successfully!
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={updateSetting.isPending}
                        className="btn-primary flex items-center gap-2 px-6 disabled:opacity-50"
                    >
                        <Save size={20} />
                        {updateSetting.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}
