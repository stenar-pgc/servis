import { defineRouter } from '#q-app'
import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { session, restore } from '../services/api'

export default defineRouter(() => {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/prijava', component: () => import('../pages/LoginPage.vue') },
      {
        path: '/registracija',
        component: () => import('../layouts/PublicLayout.vue'),
        meta: { public: true },
        children: [{ path: '', component: () => import('../pages/RegistrationPage.vue') }]
      },
      {
        path: '/aktivacija/:uid/:token',
        component: () => import('../layouts/PublicLayout.vue'),
        meta: { public: true },
        children: [{ path: '', component: () => import('../pages/RegistrationPage.vue') }]
      },
      {
        path: '/narocilo',
        component: () => import('../layouts/PublicLayout.vue'),
        meta: { public: true },
        children: [{ path: '', component: () => import('../pages/OrderPage.vue') }]
      },
      {
        path: '/',
        component: () => import('../layouts/MainLayout.vue'),
        children: [
          { path: '', redirect: '/servisi' },
          { path: 'servisi', component: () => import('../pages/OrdersPage.vue') },
          { path: 'servisi/:id', component: () => import('../pages/OrderPage.vue') },
          { path: 'oprema', component: () => import('../pages/EquipmentPage.vue') },
          {
            path: 'stranke',
            component: () => import('../pages/DirectoryPage.vue'),
            meta: { admin: true, kind: 'customers' }
          },
          {
            path: 'agencije',
            component: () => import('../pages/DirectoryPage.vue'),
            meta: { admin: true, kind: 'agencies' }
          },
          {
            path: 'placila',
            component: () => import('../pages/DirectoryPage.vue'),
            meta: { admin: true, kind: 'payments' }
          },
          { path: 'profil', component: () => import('../pages/ProfilePage.vue') }
        ]
      },
      { path: '/:pathMatch(.*)*', redirect: '/servisi' }
    ],
    scrollBehavior: () => ({ top: 0 })
  })
  router.beforeEach(async to => {
    await restore()
    if (to.path !== '/prijava' && !to.meta.public && !session.user) return '/prijava'
    if (to.path === '/narocilo' && session.user) return '/servisi/novo'
    if (to.meta.admin && !session.user?.admin) return '/servisi'
    if (to.path === '/prijava' && session.user) return '/servisi'
  })
  watch(
    () => session.user,
    user => {
      if (!user && !router.currentRoute.value.meta.public && router.currentRoute.value.path !== '/prijava')
        router.replace('/prijava')
    }
  )
  return router
})
