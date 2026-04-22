/**
 * 🧵 THE TAILOR — Application Hub (Mali Edition)
 * Conformément au AI Vibe Coding Standard : No business logic in UI.
 * Conformément au Yumi Hub Skill : LicenseGuard wraps everything.
 */
import { useEffect, useState } from 'react';
import {
  Scissors,
  LayoutDashboard,
  Settings,
  Wallet,
  Shirt,
  Plus,
  Bell,
  Calendar,
  Users,
  ChevronRight,
  ChevronLeft,
  Kanban,
  Package,
  LogOut,
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauri } from '@/lib/db';
import { LicenseGuard } from '@/components/Guard/LicenseGuard/index';
import { cn } from '@/lib/utils';
import { SplashScreen } from '@/components/common/SplashScreen';
import { ToastContainer } from '@/components/common/ToastContainer';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import { LoginScreen } from '@/components/Auth/LoginScreen';

// Stores
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useModelCategoryStore } from '@/store/modelCategoryStore';
import { useFabricTypeStore } from '@/store/fabricTypeStore';

// Modules
import { ClientList } from '@/components/Clients/ClientList';
import { ClientForm } from '@/components/Clients/ClientForm';
import { ClientDetail } from '@/components/Clients/ClientDetail';
import { CatalogGrid } from '@/components/Catalog/CatalogGrid';
import { ModelForm } from '@/components/Catalog/ModelForm';
import { ModelDetail } from '@/components/Catalog/ModelDetail';
import { KanbanBoard } from '@/components/Production/KanbanBoard';
import { OrderDetail } from '@/components/Production/OrderDetail';
import { CashJournal } from '@/components/Finance/CashJournal';
import { NewOrderCheckout } from '@/components/Finance/NewOrderCheckout';
import { MeasurementForm } from '@/components/Measurements/MeasurementForm';
import { CatalogPicker } from './components/Catalog/CatalogPicker';
import { AgendaView } from '@/components/Agenda/AgendaView';
import { FabricStock } from './components/Inventory/FabricStock';
import { FabricForm } from './components/Inventory/FabricForm';
import { FabricSaleModal } from './components/Inventory/FabricSaleModal';
import { FabricSaleReceipt } from './components/Inventory/FabricSaleReceipt';
import { AnalyticsDashboard } from './components/Dashboard/AnalyticsDashboard';
import { SettingsLayout } from './components/Settings/SettingsLayout';
import { UserForm } from './components/Settings/UserForm';

// Services
import * as settingsService from '@/services/settingsService';
import { getDashboardStats } from '@/services/statsService';
import { startSyncWorker } from '@/services/syncService';
import { startNotificationWatcher } from '@/services/notificationService';
import { migrateLegacyNotes } from '@/services/orderService';
import { pruneOldLogs } from '@/services/auditService';
import type { AppView, DashboardStats } from '@/types';

function App() {
  const currentView = useUIStore((s) => s.currentView);
  const navigate = useUIStore((s) => s.navigate);
  const modalType = useUIStore((s) => s.modalType);
  const modalPayload = useUIStore((s) => s.modalPayload);

  const { isAuthenticated, logout, currentUser, hasAccess } = useAuthStore();

  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const unreadNotifications = useUIStore((s) => s.notifications.filter(n => !n.read).length);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalPending: 0,
    activeOrders: 0,
    completedToday: 0,
    totalRevenuePeriod: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    topPaymentMethod: '...',
    statusDistribution: {},
    avgDeliveryDays: 0,
    avgOrderValueTrend: null,
    avgDeliveryDaysTrend: null,
    outOfStockFabrics: 0,
    lateOrders: 0,
    genderDistribution: {},
    categoryDistribution: {},
    fabricDistribution: {},
    totalClientsPeriod: 0,
    newClientsPeriod: 0,
    topClients: [],
    topModelsPeriod: [],
    loyaltyDistribution: [],
  });

  const { platform_name, platform_logo, platform_logo_theme, platform_tagline, session_timeout, refreshSettings } = useSettingsStore();

  const refreshCounter = useUIStore((s) => s.refreshCounter);

  // Init: load stats + start workers
  useEffect(() => {
    getDashboardStats().then(setStats).catch(console.error);
    
    // 🎨 Sync Boutique
    refreshSettings().catch(console.error);

    // 🏷️ Sync Categories
    useModelCategoryStore.getState().fetchCategories().catch(console.error);
    useFabricTypeStore.getState().fetchTypes().catch(console.error);
    
    // ⚙️ Sync Settings
    settingsService.getSettings().then(() => {
    }).catch(console.error);

    const cleanupSync = startSyncWorker();
    const cleanupNotify = startNotificationWatcher();
    
    // 🛠️ Migration des anciennes notes vers le mur de Post-its
    migrateLegacyNotes().then(count => {
      if (count > 0) {
        useUIStore.getState().addToast(`${count} anciennes notes synchronisées sur le mur`, 'success');
      }
    }).catch(console.error);

    // 🧹 Auto-Archive : Nettoyage silencieux du Journal (> 30 jours)
    // 🧹 Autoprune audio notes older than 30 days
    if (isTauri()) {
       pruneOldLogs().catch(console.error);
    }

    return () => {
      cleanupSync();
      cleanupNotify();
    };
  }, [refreshCounter]);

  // 🏷️ Synchronisation du titre de la fenêtre Tauri avec le branding
  useEffect(() => {
    const title = `${platform_name}${platform_tagline ? ` — ${platform_tagline}` : ''}`;
    document.title = title;
    
    // Pour Tauri v2 : Mettre à jour le titre de la fenêtre native
    if (isTauri()) {
      getCurrentWindow().setTitle(title).catch(console.error);
    }
  }, [platform_name, platform_tagline]);

  // Security Check: Redirect if current view is not allowed
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const viewToModule: Record<string, any> = {
        'dashboard': 'dashboard',
        'clients': 'clients',
        'kanban': 'kanban',
        'fabrics': 'fabrics',
        'catalog': 'catalog',
        'agenda': 'agenda',
        'finance': 'finance',
        'settings': 'settings'
      };
      
      const targetModule = viewToModule[currentView as string];
      if (targetModule && !hasAccess(targetModule)) {
          // Fallback to the first available module
          const modules: any[] = ['dashboard', 'kanban', 'clients', 'catalog'];
          for (const m of modules) {
              if (hasAccess(m)) {
                  navigate(m);
                  break;
              }
          }
      }
    }
  }, [currentView, isAuthenticated, currentUser, hasAccess]);

  // Refresh stats when navigating back to dashboard
  useEffect(() => {
    if (currentView === 'dashboard') {
      getDashboardStats().then(setStats).catch(console.error);
    }
  }, [currentView]);

  // --- ⏱️ SESSION INTELLIGENCE (Auto-Logout) ---
  useEffect(() => {
    if (!isAuthenticated) return;
    
    let timer: any;
    let alertTimer: any;
    const timeoutMs = (session_timeout || 30) * 60 * 1000;
    const alertBeforeMs = 30 * 1000;

    const resetTimer = () => {
      clearTimeout(timer);
      clearTimeout(alertTimer);
      
      alertTimer = setTimeout(() => {
        useUIStore.getState().addToast("Protection : Déconnexion dans 30 secondes...", "warning");
      }, Math.max(0, timeoutMs - alertBeforeMs));

      timer = setTimeout(() => {
        logout();
        useUIStore.getState().addToast("Session sécurisée pour inactivité.", "info");
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      clearTimeout(alertTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated, logout, session_timeout]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <LicenseGuard>
      <SplashScreen />
      <ToastContainer />
      <div className="flex h-screen w-full bg-[#FAF9F6] text-[#1C1917] overflow-hidden font-sans selection:bg-[#B68D40]/20 selection:text-[#B68D40]">
        {/* ─── Sidebar ─── */}
        <aside className={cn(
          "h-full bg-white border-r border-[#E7E5E4] flex flex-col pt-10 pb-2 transition-all duration-500 shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-20 relative",
          sidebarCollapsed ? "w-20" : "w-72"
        )}>
          {/* Toggle Button */}
          <button 
            onClick={() => toggleSidebar()}
            className="absolute -right-3 top-24 w-6 h-6 bg-white border border-[#E7E5E4] rounded-full flex items-center justify-center shadow-sm hover:bg-[#FAF9F6] transition-colors z-30"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>

          {/* Brand */}
          <div className={cn("px-8 mb-16 flex items-center transition-all duration-500", sidebarCollapsed ? "justify-center px-0" : "gap-4")}>
            <div className={cn(
              "w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-2xl transition-transform duration-500 overflow-hidden border-2 border-white",
              platform_logo_theme === 'light' ? "bg-[#1C1917]" : "bg-[#FAF9F6]"
            )}>
              {platform_logo ? (
                 <img src={platform_logo} alt="" className="w-full h-full object-cover" />
              ) : (
                 <Scissors className={cn("w-5 h-5 stroke-[1.5]", platform_logo_theme === 'light' ? "text-white" : "text-[#1C1917]")} />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                <span className="text-xl font-serif italic tracking-tight text-[#1C1917] leading-none block">{platform_name}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#B68D40] mt-1 block max-w-[200px] leading-tight break-words">
                  {platform_tagline}
                </span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar pt-2 flex flex-col">
            {hasAccess('dashboard') && <NavItem icon={<LayoutDashboard />} label="Tableau de Bord" view="dashboard" current={currentView} onClick={navigate} isCollapsed={sidebarCollapsed} />}
            {hasAccess('clients') && <NavItem icon={<Users />} label="Galerie Clients" view="clients" current={currentView} onClick={navigate} isCollapsed={sidebarCollapsed} />}
            {hasAccess('kanban') && <NavItem icon={<Kanban />} label="Confection" view="kanban" current={currentView} onClick={navigate} isCollapsed={sidebarCollapsed} />}
            {hasAccess('fabrics') && <NavItem icon={<Package />} label="Stock Tissus" view="fabrics" current={currentView} onClick={navigate} isCollapsed={sidebarCollapsed} />}
            {hasAccess('catalog') && <NavItem icon={<Shirt />} label="Boutique & Modèles" view="catalog" current={currentView} onClick={navigate} isCollapsed={sidebarCollapsed} />}
            {hasAccess('agenda') && <NavItem icon={<Calendar />} label="Agenda & Planning" view="agenda" current={currentView} onClick={navigate} isCollapsed={sidebarCollapsed} />}
            {hasAccess('finance') && <NavItem icon={<Wallet />} label="Livre de Caisse" view="finance" current={currentView} onClick={navigate} isCollapsed={sidebarCollapsed} />}
            <div className="pt-4 pb-2 opacity-20"><div className="h-px bg-[#E7E5E4] mx-4" /></div>
            {hasAccess('settings') && <NavItem icon={<Settings />} label="Paramètres" view="settings" current={currentView} onClick={navigate} isCollapsed={sidebarCollapsed} />}
            
            {/* User Profile & Logout (Subtle) */}
            <div className="mt-auto px-2 pb-4">
                <div className={cn(
                    "p-3 bg-[#FAF9F6] border border-[#E7E5E4] rounded-[1.5rem] flex items-center gap-3 relative group/profile transition-all duration-300", 
                    sidebarCollapsed && "flex-col justify-center px-0 py-6 bg-transparent border-transparent gap-4"
                )}>
                    <div className="w-8 h-8 rounded-full bg-[#1C1917] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden border border-[#E7E5E4] shadow-sm flex-shrink-0 transition-transform group-hover/profile:scale-110">
                        {currentUser?.avatar_path ? <img src={currentUser.avatar_path} alt="" className="w-full h-full object-cover" /> : currentUser?.full_name[0]}
                    </div>
                   {!sidebarCollapsed && (
                     <div className="flex-1 min-w-0 pr-6 animate-in fade-in slide-in-from-left-2 duration-300">
                         <p className="text-[9px] font-serif italic text-[#1C1917] truncate">{currentUser?.full_name}</p>
                         <p className="text-[7px] font-black uppercase tracking-widest text-[#B68D40]">{currentUser?.role}</p>
                     </div>
                   )}
                   
                   {/* Subtle Logout Icon Button */}
                   <button 
                     onClick={logout}
                     className={cn(
                        "p-1.5 text-[#A8A29E] hover:text-red-500 hover:bg-white rounded-full transition-all border border-transparent hover:border-red-100 shadow-sm",
                        sidebarCollapsed ? "relative" : "absolute right-2"
                     )}
                     title="Déconnexion"
                   >
                     <LogOut className="w-3.5 h-3.5" />
                   </button>
                </div>
            </div>

          </nav>
          
          {/* CREATOR SIGNATURE (Subtle & Absolute Bottom) */}
          <div className={cn(
            "mt-auto pb-4 transition-all duration-500 text-center",
            sidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-10 hover:opacity-100"
          )}>
            <div className="mx-8 border-t border-[#E7E5E4] pt-4">
              <p className="text-[7px] font-black uppercase tracking-[0.25em] text-[#1C1917]">
                Conçu au Mali par Youma
              </p>
            </div>
          </div>
        </aside>

        {/* ─── Main ─── */}
        <main className="flex-1 h-full flex flex-col overflow-hidden relative">
          {/* Header */}
          <header className="h-20 bg-white/50 backdrop-blur-xl border-b border-[#E7E5E4] px-8 flex items-center justify-between z-50 flex-shrink-0">
            <div className="flex-1" />
            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2 opacity-50">
                <Calendar className="w-4 h-4 text-[#B68D40]" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).toUpperCase()}
                </span>
              </div>
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
                  className={cn(
                    "p-2.5 rounded-full transition-all duration-300 relative group",
                    isNotificationCenterOpen ? "bg-[#1C1917] text-white" : "hover:bg-[#F5F5F4] text-[#78716C]"
                  )}
                >
                  <Bell className={cn("w-5 h-5", isNotificationCenterOpen ? "text-[#B68D40]" : "")} />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                      {unreadNotifications}
                    </span>
                  )}
                </button>
                <NotificationCenter 
                  isOpen={isNotificationCenterOpen} 
                  onClose={() => setIsNotificationCenterOpen(false)} 
                />
              </div>
              <button
                type="button"
                onClick={() => navigate('new_order')}
                className="h-11 px-6 bg-[#1C1917] text-white rounded-full flex items-center gap-2.5 font-bold text-[10px] uppercase tracking-[0.15em] shadow-lg hover:bg-black transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Nouvelle Commande</span>
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            {currentView === 'dashboard' && hasAccess('dashboard') && <AnalyticsDashboard stats={stats} />}
            {currentView === 'dashboard' && !hasAccess('dashboard') && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                     <div className="w-16 h-16 bg-[#1C1917] rounded-full flex items-center justify-center text-white mb-6 shadow-2xl">
                        <Kanban className="w-6 h-6" />
                     </div>
                     <h2 className="text-2xl font-serif italic text-[#1C1917] mb-2">Bonjour, {currentUser?.full_name}</h2>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#B68D40]">Bienvenue dans votre espace confection</p>
                     <button 
                        onClick={() => navigate('kanban')}
                        className="mt-10 h-12 px-8 border border-[#B68D40] text-[#B68D40] rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-[#B68D40] hover:text-white transition-all shadow-lg shadow-white"
                     >
                        Accéder à la Confection
                     </button>
                </div>
            )}
            {currentView === 'clients' && <ClientList />}
            {currentView === 'client_detail' && <ClientDetail />}
            {currentView === 'catalog' && <CatalogGrid />}
            {currentView === 'kanban' && <KanbanBoard />}
            {currentView === 'finance' && <CashJournal />}
            {currentView === 'agenda' && <AgendaView />}
            {currentView === 'new_order' && <NewOrderCheckout />}
            {currentView === 'fabrics' && <FabricStock />}
            {currentView === 'settings' && <SettingsLayout />}
            {currentView === 'orders' && <PlaceholderView />}
          </div>
        </main>

        {/* ─── Modals ─── */}
        {modalType === 'client_form' && <ClientForm />}
        {modalType === 'model_form' && <ModelForm />}
        {modalType === 'order_detail' && <OrderDetail />}
        {modalType === 'measurement_form' && <MeasurementForm orderId={modalPayload as string} />}
        {modalType === 'model_detail' && <ModelDetail />}
        {modalType === 'catalog_picker' && <CatalogPicker payload={modalPayload as any} />}
        {modalType === 'fabric_form' && <FabricForm />}
        {modalType === 'fabric_sale' && <FabricSaleModal />}
        {modalType === 'fabric_sale_receipt' && <FabricSaleReceipt />}
        {modalType === 'user_form' && <UserForm />}
        <ConfirmModal />
      </div>
    </LicenseGuard>
  );
}

function NavItem({ icon, label, view, current, onClick, isCollapsed }: {
  icon: React.ReactNode; label: string; view: AppView; current: AppView; onClick: (v: AppView) => void; isCollapsed: boolean;
}) {
  const active = current === view;
  return (
    <button
      onClick={() => onClick(view)}
      className={cn(
        'w-full h-14 px-5 rounded-full flex items-center gap-4 transition-all duration-300 group relative',
        active ? 'bg-[#1C1917] text-white shadow-lg' : 'hover:bg-[#F5F5F4] text-[#78716C] hover:text-[#1C1917]',
        isCollapsed && 'justify-center px-0'
      )}
    >
      <span className={cn('w-5 h-5 transition-transform flex-shrink-0', active ? 'text-[#B68D40]' : 'opacity-40 group-hover:opacity-100')}>{icon}</span>
      {!isCollapsed && <span className="font-bold text-[10px] uppercase tracking-[0.15em] truncate animate-in fade-in duration-300">{label}</span>}
    </button>
  );
}

function PlaceholderView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-[#E7E5E4] shadow-sm mb-6">
        <Scissors className="w-6 h-6 text-[#B68D40]/40" />
      </div>
      <h3 className="text-xl font-serif italic mb-1">Module en confection...</h3>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8A29E]">Bientôt disponible</p>
    </div>
  );
}

export default App;
