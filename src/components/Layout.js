import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import { Menu as MenuIcon, Dashboard, People, Room, Checklist, Assessment, History, Logout, Settings } from '@mui/icons-material';
import { authAPI } from '../services/api';


const DRAWER_WIDTH = 240;

export default function Layout() {
  const navigate = useNavigate();
  const user = authAPI.getCurrentUser();
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  const toggleMobile = () => setMobileOpen((o) => !o);

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Utilisateurs', icon: <People />, path: '/users' },
    { text: 'Salles', icon: <Room />, path: '/rooms' },
    { text: 'Checklists', icon: <Checklist />, path: '/checklists' },
    { text: 'Historique salles', icon: <Assessment />, path: '/history-salles' },
    { text: 'Analyse de risque', icon: <History />, path: '/analyse-salles' },
    { text: 'Paramètres', icon: <Settings />, path: '/settings' }
  ];

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH }} role="presentation" onClick={isMdDown ? toggleMobile : undefined}>
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => (
            <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMdDown && (
            <IconButton color="inherit" edge="start" onClick={toggleMobile} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ServerRoom Guardian
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>{user?.email}</Typography>
          <IconButton color="inherit" onClick={handleLogout}><Logout /></IconButton>
        </Toolbar>
      </AppBar>

      {/* Temporary drawer for small screens */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={toggleMobile}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
      >
        {drawerContent}
      </Drawer>

      {/* Permanent drawer for md+ screens */}
      <Drawer
        variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}
        open
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%', ml: { md: `${DRAWER_WIDTH}px` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
