<template>
  <q-page class="page">
    <div class="page-heading">
      <div>
        <q-btn
          v-if="!publicMode"
          flat
          dense
          no-caps
          icon="arrow_back"
          :label="$t('orders.back')"
          to="/servisi"
          class="q-mb-md" />
        <h1>
          {{ $t(isNew ? 'orders.newService' : 'orders.servicing') }}
          <span v-if="!isNew" class="text-grey-5">{{ orderNumber(form.id) }}</span>
        </h1>
        <p>{{ $t('orders.tagline') }}</p>
      </div>
      <StatusBadge v-if="!isNew" :value="form.status" />
    </div>
    <ErrorBanner :message="loadError" retry @retry="load" />
    <q-inner-loading :showing="loading" />
    <q-banner v-if="submitted" rounded class="bg-teal-1 text-primary q-mb-lg">
      {{ $t('orders.received') }} {{ orderNumber(submitted) }}
    </q-banner>
    <div v-if="submitted && contact.create_account" class="q-mb-lg">
      <p>{{ $t('auth.activationSent') }}</p>
      <ErrorBanner :message="activationSent ? '' : $t('errors.emailFailed')" />
      <q-btn outline no-caps color="primary" :label="$t('auth.resendEmail')" @click="resendActivation" />
    </div>
    <q-form
      v-if="!loading && !loadError && !submitted"
      greedy
      no-error-focus
      @validation-error="showValidationError"
      @submit="save">
      <div class="order-grid">
        <div>
          <q-card flat bordered class="q-mb-lg">
            <q-expansion-item v-model="sections.service" group="service-form" data-order-step="service">
              <template #header>
                <q-item-section>
                  <div class="row items-center q-mb-none">
                    <q-avatar color="teal-1" text-color="primary" size="30px" class="q-mr-sm">1</q-avatar>
                    <h2>{{ $t('orders.serviceDetails') }}</h2>
                  </div>
                </q-item-section>
              </template>
              <div class="q-pa-lg">
                <q-select
                  v-if="session.user?.admin && !newCustomer"
                  ref="equipmentSelect"
                  v-model="form.equipment_id"
                  outlined
                  use-input
                  fill-input
                  hide-selected
                  clearable
                  :input-debounce="0"
                  :options="filteredEquipmentOptions"
                  emit-value
                  map-options
                  :label="$t('equipment.title')"
                  :hint="$t('equipment.optional')"
                  :disable="readonly"
                  @filter="filterEquipment">
                  <template #before-options>
                    <q-item v-if="!readonly" clickable @click="addEquipment">
                      <q-item-section avatar><q-icon name="add" color="primary" /></q-item-section>
                      <q-item-section class="text-primary">{{ $t('equipment.add') }}</q-item-section>
                    </q-item>
                    <q-separator />
                  </template>
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey-7">
                        {{ $t(equipment.length ? 'common.noResults' : 'equipment.noneRegistered') }}
                      </q-item-section>
                    </q-item>
                    <q-item v-if="!readonly" clickable @click="addEquipment">
                      <q-item-section avatar><q-icon name="add" color="primary" /></q-item-section>
                      <q-item-section class="text-primary">{{ $t('equipment.add') }}</q-item-section>
                    </q-item>
                  </template>
                </q-select>
                <div v-if="session.user?.admin && newCustomer" class="form-grid q-mb-md">
                  <q-select
                    outlined
                    dense
                    v-model="guestEquipment.type"
                    :options="equipmentTypes.map(value => ({ value, label: translateText(value) }))"
                    emit-value
                    map-options
                    :label="$t('equipment.type')"
                    class="wide" />
                  <EquipmentModelFields
                    v-model:manufacturer="guestEquipment.manufacturer"
                    v-model:model="guestEquipment.model"
                    :type="guestEquipment.type"
                    :required="false" />
                  <q-input outlined dense v-model="guestEquipment.size" :label="$t('equipment.size')" />
                  <q-input outlined dense v-model="guestEquipment.serial" :label="$t('equipment.serial')" />
                </div>
                <q-input
                  outlined
                  v-model="form.description"
                  type="textarea"
                  :rows="3"
                  :label="$t('orders.description') + (selectedItems.length ? '' : ' *')"
                  :rules="[value => selectedItems.length > 0 || required(value)]"
                  reactive-rules
                  :readonly="readonly" />
                <ServiceSelector
                  v-model:quantities="form.quantities"
                  v-model:english="form.english_report"
                  :catalog="catalog"
                  :price="price"
                  :readonly="readonly"
                  :editing="editing" />
              </div>
            </q-expansion-item>
          </q-card>
          <q-card flat bordered class="q-mb-lg">
            <q-expansion-item v-model="sections.contact" group="service-form" data-order-step="contact">
              <template #header>
                <q-item-section>
                  <div class="row items-center q-mb-none">
                    <q-avatar color="teal-1" text-color="primary" size="30px" class="q-mr-sm">2</q-avatar>
                    <h2>{{ $t(session.user?.admin ? 'customers.details' : 'contact.yourDetails') }}</h2>
                  </div>
                </q-item-section>
              </template>
              <div class="q-pa-lg">
                <div v-if="publicMode" class="form-grid">
                  <div class="wide row items-center justify-between">
                    <span>{{ $t('auth.existingAccount') }}</span>
                    <q-btn flat no-caps to="/prijava" :label="$t('auth.login')" />
                  </div>
                  <q-input
                    outlined
                    dense
                    v-model="contact.first"
                    :label="$t('contact.firstName') + ' *'"
                    :rules="[required]" />
                  <q-input
                    outlined
                    dense
                    v-model="contact.last"
                    :label="$t('contact.lastName') + ' *'"
                    :rules="[required]" />
                  <q-input
                    outlined
                    dense
                    type="email"
                    v-model="contact.mail"
                    :label="$t('contact.email') + ' *'"
                    :rules="[required]" />
                  <q-input
                    outlined
                    dense
                    type="tel"
                    v-model="contact.phone"
                    :label="$t('contact.phone') + ' *'"
                    :rules="[required]" />
                  <q-checkbox v-model="contact.create_account" :label="$t('auth.wantAccount')" class="wide" />
                  <p v-if="contact.create_account" class="wide text-caption text-grey-7">
                    {{ $t('auth.activationSent') }}
                  </p>
                </div>
                <div v-else-if="session.user?.admin" class="q-mb-lg">
                  <q-toggle v-model="newCustomer" :label="$t('customers.new')" />
                  <p v-if="newCustomer" class="text-caption text-grey-7">
                    {{ $t('customers.createWithOrder') }}
                  </p>
                  <div v-if="newCustomer" class="form-grid">
                    <q-input
                      outlined
                      v-model="newContact.name"
                      :label="$t('contact.fullName') + ' *'"
                      :rules="[required]"
                      class="wide" />
                    <q-input
                      outlined
                      v-model="newContact.mail"
                      type="email"
                      :label="$t('contact.email') + ' *'"
                      :rules="[required]" />
                    <q-input outlined v-model="newContact.phone" :label="$t('contact.phone')" />
                    <q-input outlined v-model="newContact.address" :label="$t('contact.address')" class="wide" />
                  </div>
                  <q-select
                    v-else
                    v-model="customerId"
                    outlined
                    :options="customers"
                    option-label="name"
                    option-value="id"
                    emit-value
                    map-options
                    clearable
                    :label="$t('customers.customer')"
                    :hint="$t('customers.assignLater')"
                    @update:model-value="customerChanged" />
                </div>
                <div v-else class="row items-center no-wrap">
                  <q-avatar icon="person_outline" color="grey-2" text-color="primary" class="q-mr-md" />
                  <div>
                    <strong>{{ owner?.name || session.user?.name }}</strong>
                    <div class="text-grey-7 q-mt-xs">{{ owner?.mail || session.user?.mail }}</div>
                    <div v-if="owner?.phone" class="text-grey-7">
                      {{ owner.phone }}
                    </div>
                    <div v-if="owner?.address" class="text-grey-7 q-mt-xs">
                      {{ owner.address }}
                    </div>
                  </div>
                  <q-space />
                  <q-btn
                    v-if="!session.user?.admin"
                    flat
                    no-caps
                    to="/profil"
                    icon="edit"
                    :label="$t('profile.title')" />
                </div>
                <q-checkbox
                  v-if="!readonly"
                  v-model="hasDiscount"
                  :label="$t('orders.hasDiscount')"
                  class="q-mt-md"
                  @update:model-value="
                    value => {
                      if (!value) form.discount_code = ''
                    }
                  " />
                <q-input
                  v-if="!readonly && hasDiscount"
                  outlined
                  dense
                  v-model="form.discount_code"
                  :label="$t('agencies.discountCode')"
                  class="q-mt-lg"
                  :hint="$t('orders.discountHint')" />
              </div>
            </q-expansion-item>
          </q-card>
          <q-card flat bordered class="q-mb-lg">
            <q-expansion-item v-model="sections.delivery" group="service-form" data-order-step="delivery">
              <template #header>
                <q-item-section>
                  <div class="row items-center q-mb-none">
                    <q-avatar color="teal-1" text-color="primary" size="30px" class="q-mr-sm">3</q-avatar>
                    <h2>{{ $t('delivery.sectionTitle') }}</h2>
                  </div>
                </q-item-section>
              </template>
              <div class="q-pa-lg">
                <div class="text-weight-medium q-mb-sm">{{ $t('delivery.title') }}</div>
                <q-option-group
                  v-model="form.delivery"
                  :options="translatedDeliveries"
                  :disable="readonly"
                  color="primary" />
                <q-input
                  v-if="form.delivery === 'other'"
                  outlined
                  v-model="form.delivery_note"
                  :label="$t('delivery.otherHint')"
                  type="textarea"
                  rows="2"
                  :readonly="readonly"
                  class="q-mt-md" />
                <q-separator class="q-my-lg" />
                <div class="text-weight-medium q-mb-sm">{{ $t('payment.method') }}</div>
                <q-option-group
                  v-model="form.payment_method"
                  :options="translatedPayments"
                  :disable="readonly"
                  color="primary" />
                <div class="text-caption text-grey-6 q-mt-md">
                  {{ $t('payment.afterServiceHint') }}
                </div>
              </div>
            </q-expansion-item>
          </q-card>
          <template v-if="session.user?.admin">
            <q-card flat bordered class="section-card">
              <div class="row items-center q-mb-lg">
                <h2>{{ $t('orders.administration') }}</h2>
                <q-space />
                <q-badge color="teal-1" text-color="primary">{{ $t('roles.admin') }}</q-badge>
              </div>
              <q-select
                outlined
                v-model="form.status"
                :options="translatedStatuses"
                emit-value
                map-options
                :label="$t('orders.status')" />
              <q-btn
                v-if="editing"
                outline
                no-caps
                icon="note_add"
                :label="$t('orders.createInvoice')"
                disable
                class="full-width q-mt-md" />
              <q-expansion-item
                icon="account_balance_wallet"
                v-if="editing"
                :label="$t('finance.title')"
                class="q-mt-lg">
                <div class="form-grid q-pt-md">
                  <q-input
                    outlined
                    dense
                    type="number"
                    min="0"
                    step="0.01"
                    v-model.number="form.received"
                    :label="$t('finance.received')" />
                  <q-input
                    outlined
                    dense
                    type="number"
                    min="0"
                    step="0.01"
                    v-model.number="form.costs"
                    :label="$t('finance.costs')" />
                  <q-select
                    outlined
                    dense
                    v-model="form.agency_id"
                    :options="agencies"
                    option-label="name"
                    option-value="id"
                    emit-value
                    map-options
                    clearable
                    :label="$t('agencies.agency')"
                    class="wide" />
                  <q-input
                    outlined
                    dense
                    type="number"
                    min="0"
                    step="0.01"
                    v-model.number="form.agency_commission"
                    :label="$t('finance.agencyFee')"
                    class="wide" />
                  <div class="wide row justify-between q-py-sm">
                    <span>{{ $t('finance.netIncome') }}</span>
                    <strong>
                      {{ money( Number(form.received || 0) - Number(form.costs || 0) - Number(form.agency_commission || 0) ) }}
                    </strong>
                  </div>
                  <q-checkbox v-model="form.finance_complete" :label="$t('finance.complete')" class="wide" />
                </div>
              </q-expansion-item>
            </q-card>
          </template>
          <q-card v-if="!isNew && (!session.user?.admin || editing)" flat bordered class="section-card">
            <h2 class="q-mb-lg">{{ $t('documents.title') }}</h2>
            <div v-if="!documents.length" class="text-grey-6 q-mb-md">
              {{ $t('documents.empty') }}
            </div>
            <div v-for="group in documentGroups" :key="group.key" class="service-item q-mb-md">
              <div class="text-weight-medium">
                {{ $t(group.kind === 'report' ? 'documents.serviceReport' : 'documents.invoice') }}
                {{ group.report_number }}
              </div>
              <div v-if="group.equipment_label" class="text-caption text-grey-7 q-mt-xs">
                {{ group.equipment_label }} · {{ group.serial }}
              </div>
              <div v-for="doc in group.files" :key="doc.id" class="row items-center no-wrap q-mt-sm">
                <q-icon name="picture_as_pdf" color="primary" size="24px" class="q-mr-md" />
                <div class="col ellipsis">{{ doc.filename }}</div>
                <q-btn flat round dense icon="download" :aria-label="$t('documents.download')" @click="download(doc)" />
                <q-btn
                  v-if="session.user?.admin"
                  flat
                  round
                  dense
                  icon="close"
                  :aria-label="$t('documents.remove')"
                  @click="removeDocument(doc)" />
              </div>
            </div>
            <template v-if="session.user?.admin">
              <q-separator class="q-my-md" />
              <div class="form-grid">
                <q-select
                  outlined
                  dense
                  v-model="uploadKind"
                  :options="[
                    { value: 'report', label: $t('documents.serviceReport') },
                    { value: 'invoice', label: $t('documents.invoice') }
                  ]"
                  emit-value
                  map-options
                  :label="$t('documents.type')" />
                <q-input outlined dense v-model="reportNumber" :label="$t('documents.reference')" />
                <q-input
                  v-if="uploadKind === 'report'"
                  outlined
                  dense
                  v-model="reportEquipment"
                  :label="$t('documents.equipmentLabel')" />
                <q-input
                  v-if="uploadKind === 'report'"
                  outlined
                  dense
                  v-model="reportSerial"
                  :label="$t('equipment.serial')" />
                <q-file
                  outlined
                  dense
                  v-model="uploadFile"
                  accept="application/pdf,.pdf"
                  :max-file-size="10485760"
                  :label="$t('documents.choosePdf')"
                  class="wide"
                  clearable
                  @rejected="documentError = t('errors.pdfSize')" />
              </div>
              <ErrorBanner :message="documentError" class="q-mt-md" />
              <q-btn
                outline
                no-caps
                color="primary"
                icon="upload_file"
                :label="$t('documents.upload')"
                :disable="!uploadFile"
                :loading="uploading"
                @click="upload"
                class="q-mt-md" />
            </template>
            <q-expansion-item
              v-if="session.user?.admin && documents.length"
              icon="mail_outline"
              :label="$t('email.sendDocuments')"
              class="q-mt-lg">
              <div class="q-gutter-md q-pt-md">
                <q-select
                  outlined
                  dense
                  v-model="email.recipient"
                  @update:model-value="resetEmail"
                  :options="[
                    { value: 'customer', label: $t('email.sendToCustomer') },
                    { value: 'self', label: $t('email.sendToSelf') }
                  ]"
                  emit-value
                  map-options
                  :label="$t('payouts.recipient')" />
                <q-input outlined dense v-model="email.mail" type="email" :label="$t('contact.email')" />
                <q-input outlined dense v-model="email.subject" :label="$t('email.subject')" />
                <q-input outlined v-model="email.message" :label="$t('email.message')" type="textarea" rows="5" />
                <div class="text-caption text-grey-6">
                  {{ $t('email.attachmentsHint') }}
                </div>
                <q-btn flat dense no-caps icon="refresh" :label="$t('common.reset')" @click="resetEmail" />
                <ErrorBanner :message="emailError" />
                <q-btn
                  outline
                  no-caps
                  color="primary"
                  icon="send"
                  :label="$t('email.sendDocuments')"
                  :loading="sending"
                  :disable="!email.subject.trim() || !email.message.trim()"
                  @click="sendDocuments" />
              </div>
            </q-expansion-item>
          </q-card>
          <q-card v-if="session.user?.admin && editing && !isNew" flat bordered class="section-card">
            <h2 class="q-mb-lg">{{ $t('comments.title') }}</h2>
            <div v-if="!comments.length" class="text-grey-6 q-mb-md">
              {{ $t('comments.empty') }}
            </div>
            <div v-for="c in comments" :key="c.id" class="bg-grey-1 rounded-borders q-pa-md q-mb-md">
              <div class="text-caption text-grey-7 q-mb-sm">{{ c.author_name }} · {{ date(c.created_at) }}</div>
              <div style="white-space: pre-wrap">{{ c.body }}</div>
            </div>
            <q-input outlined v-model="comment" :label="$t('comments.placeholder')" type="textarea" rows="2" />
            <ErrorBanner :message="commentError" class="q-mt-md" />
            <q-btn
              unelevated
              no-caps
              color="primary"
              :label="$t('comments.post')"
              :disable="!comment.trim()"
              :loading="commenting"
              @click="addComment"
              class="q-mt-md" />
          </q-card>
        </div>
        <q-card flat bordered class="section-card summary-card">
          <div class="eyebrow">{{ $t('orders.summary') }}</div>
          <h2 class="q-mb-lg">{{ $t('finance.estimate') }}</h2>
          <div v-for="item in selectedItems" :key="item.code" class="row no-wrap justify-between q-mb-md">
            <span class="text-grey-7 q-pr-sm">{{ translateText(item.label) }} × {{ item.quantity }}</span>
            <strong class="text-no-wrap">{{ money(item.quantity * price(item)) }}</strong>
          </div>
          <div class="row justify-between q-mb-md">
            <span class="text-grey-7">{{ $t('delivery.label') }}</span>
            <span>{{ money(shipping) }}</span>
          </div>
          <div v-if="Number(form.discount_amount)" class="row justify-between q-mb-md">
            <span class="text-grey-7">{{ $t('finance.discount') }}</span>
            <span>−{{ money(form.discount_amount) }}</span>
          </div>
          <q-separator class="q-my-lg" />
          <div class="text-grey-7">{{ $t('finance.estimatedTotal') }}</div>
          <div class="text-h4 text-weight-medium q-mt-sm q-mb-lg">{{ money(total) }}</div>
          <q-btn
            v-if="!readonly"
            outline
            no-caps
            color="primary"
            :label="$t(review ? 'orders.hideReview' : 'orders.review')"
            @click="review = !review"
            class="full-width q-mb-md" />
          <div v-if="review" class="bg-grey-1 q-pa-md q-mb-md rounded-borders">
            <div>{{ publicMode ? contact.first + ' ' + contact.last : owner?.name }}</div>
            <div>{{ publicMode ? contact.mail : owner?.mail }}</div>
            <div>
              {{ publicMode ? guestEquipment.manufacturer + ' ' + guestEquipment.model : equipmentOptions.find(e => e.value === form.equipment_id)?.label }}
            </div>
            <p class="q-mb-none q-mt-sm">{{ form.description }}</p>
          </div>
          <ErrorBanner :message="saveError" />
          <q-btn
            v-if="!readonly"
            unelevated
            no-caps
            color="primary"
            type="submit"
            :label="$t(isNew ? 'orders.submit' : 'common.saveChanges')"
            icon-right="arrow_forward"
            :loading="saving"
            class="full-width" />
          <div class="text-caption text-grey-6 q-mt-md">
            {{ $t('finance.estimateHint') }}
          </div>
        </q-card>
      </div>
    </q-form>
    <EquipmentEditor
      v-if="!publicMode"
      v-model="equipmentEditor"
      :customers="customers"
      :customer-id="customerId"
      @saved="equipmentSaved" />
  </q-page>
</template>
<script setup>
  import { computed, nextTick, onMounted, reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useQuasar } from 'quasar'
  import {
    API_URL,
    api,
    date,
    deliveries,
    equipmentTypes,
    money,
    orderNumber,
    paymentMethods,
    session,
    statuses
  } from '../services/api'
  import { t, i18n, translateText } from '../i18n'
  import ErrorBanner from '../components/ErrorBanner.vue'
  import EquipmentEditor from '../components/EquipmentEditor.vue'
  import EquipmentModelFields from '../components/EquipmentModelFields.vue'
  import StatusBadge from '../components/StatusBadge.vue'
  import ServiceSelector from '../components/ServiceSelector.vue'
  const route = useRoute(),
    router = useRouter(),
    q = useQuasar(),
    publicMode = route.path === '/narocilo',
    isNew = publicMode || route.params.id === 'novo'
  const sections = reactive({ service: true, contact: false, delivery: false })
  const readonly = !isNew && !session.user?.admin
  const form = reactive({
    id: null,
    equipment_id: null,
    description: '',
    status: 'submitted',
    delivery: 'personal',
    delivery_note: '',
    payment_method: 'pickup',
    english_report: false,
    discount_code: '',
    quantities: {},
    received: 0,
    costs: 0,
    agency_commission: 0,
    discount_amount: 0,
    finance_complete: false
  })
  const catalog = ref([]),
    equipment = ref([]),
    customers = ref([]),
    documents = ref([]),
    comments = ref([]),
    equipmentEditor = ref(false),
    loading = ref(true),
    loadError = ref(''),
    saving = ref(false),
    saveError = ref(''),
    uploadKind = ref('report'),
    reportNumber = ref(''),
    uploadFile = ref(null),
    uploading = ref(false),
    documentError = ref(''),
    comment = ref(''),
    commenting = ref(false),
    commentError = ref(''),
    acceptedPrices = ref({})
  const newCustomer = ref(false)
  const customerId = ref(null)
  const newContact = reactive({ name: '', mail: '', phone: '', address: '' })
  const contact = reactive({ first: '', last: '', mail: '', phone: '', create_account: true })
  const guestEquipment = reactive({ type: 'Jadralno padalo', manufacturer: '', model: '', size: '', serial: '' })
  const submitted = ref(null)
  const activationSent = ref(true)
  const hasDiscount = ref(false)
  const review = ref(false)
  const agencies = ref([])
  const reportEquipment = ref('')
  const reportSerial = ref('')
  const documentGroups = computed(() => {
    const groups = new Map()
    for (const doc of documents.value) {
      const key = `${doc.kind}:${doc.report_number || doc.id}:${doc.equipment_label || ''}:${doc.serial || ''}`
      if (!groups.has(key)) groups.set(key, { ...doc, key, files: [] })
      groups.get(key).files.push(doc)
    }
    return [...groups.values()]
  })
  const editing = computed(() => ['in_service', 'completed'].includes(form.status))
  const required = v => !!String(v || '').trim() || t('validation.required')
  const email = reactive({
    recipient: 'customer',
    mail: '',
    subject: t('email.customerSubject'),
    message: t('email.defaultMessage')
  })
  const emailError = ref(''),
    sending = ref(false)
  const equipmentOptions = computed(() =>
    equipment.value
      .filter(e => !customerId.value || !e.customer_id || Number(e.customer_id) === Number(customerId.value))
      .map(e => ({
        value: Number(e.id),
        label: `${e.manufacturer} ${e.model} ${e.size} · ${e.serial || ''}${session.user?.admin ? ' · ' + (e.customer_name || t('equipment.noOwner')) : ''}`
      }))
  )
  const equipmentSelect = ref(null)
  const equipmentSearch = ref('')
  const filteredEquipmentOptions = computed(() =>
    equipmentOptions.value.filter(option => option.label.toLowerCase().includes(equipmentSearch.value.toLowerCase()))
  )

  function filterEquipment(value, update) {
    update(() => {
      equipmentSearch.value = value
    })
  }

  function customerChanged() {
    const selected = equipment.value.find(item => Number(item.id) === Number(form.equipment_id))
    if (selected?.customer_id && Number(selected.customer_id) !== Number(customerId.value)) form.equipment_id = null
  }

  function addEquipment() {
    equipmentSelect.value.hidePopup()
    equipmentEditor.value = true
  }

  const owner = computed(
    () =>
      customers.value.find(
        c =>
          Number(c.id) ===
          Number(equipment.value.find(e => Number(e.id) === Number(form.equipment_id))?.customer_id || customerId.value)
      ) || (!session.user?.admin ? session.user : null)
  )
  const translatedDeliveries = computed(() => deliveries.map(d => ({ ...d, label: t(d.label) })))
  const translatedPayments = computed(() => paymentMethods.map(p => ({ ...p, label: t(p.label) })))
  const translatedStatuses = computed(() => statuses.map(s => ({ ...s, label: t(s.label) })))
  const price = item => Number(acceptedPrices.value[item.code] ?? item.price)
  const selectedItems = computed(() =>
    catalog.value
      .filter(i => Number(form.quantities[i.code]) > 0)
      .map(i => ({ ...i, quantity: Number(form.quantities[i.code]) }))
  )
  const shipping = computed(() => (form.delivery === 'post' ? 5 : form.delivery === 'gls' ? 10 : 0))
  const total = computed(
    () =>
      selectedItems.value.reduce((s, i) => s + i.quantity * price(i), 0) +
      shipping.value -
      Number(form.discount_amount || 0)
  )
  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      const result = await Promise.all([
        api('catalog'),
        publicMode ? [] : api('equipment'),
        session.user?.admin ? api('customers') : [],
        session.user?.admin ? api('agencies') : []
      ])
      catalog.value = result[0]
      equipment.value = result[1]
      customers.value = result[2]
      agencies.value = result[3]
      for (const item of catalog.value) form.quantities[item.code] = 0
      if (isNew) {
        form.equipment_id = route.query.equipment ? Number(route.query.equipment) : null
        customerId.value = equipment.value.find(e => Number(e.id) === form.equipment_id)?.customer_id || null
      } else {
        newCustomer.value = false
        const order = await api('order/' + route.params.id)
        Object.assign(form, order, {
          equipment_id: order.equipment_id ? Number(order.equipment_id) : null,
          english_report: !!Number(order.english_report),
          finance_complete: !!Number(order.finance_complete),
          discount_code: ''
        })
        customerId.value = order.customer_id ? Number(order.customer_id) : null
        acceptedPrices.value = {}
        for (const item of order.items) {
          form.quantities[item.service_code] = Number(item.quantity)
          acceptedPrices.value[item.service_code] = Number(item.unit_price)
        }
        documents.value = order.documents
        comments.value = order.comments || []
        const selected = equipment.value.find(e => Number(e.id) === Number(order.equipment_id))
        reportEquipment.value = selected ? `${selected.manufacturer} ${selected.model} ${selected.size || ''}` : ''
        reportSerial.value = selected?.serial || ''
        resetEmail()
      }
    } catch (e) {
      loadError.value = e.message
    } finally {
      loading.value = false
    }
  }
  async function showValidationError(component) {
    saveError.value = t('validation.completeFields')
    const section = component?.$el?.closest('[data-order-step]')
    if (section) sections[section.dataset.orderStep] = true
    await nextTick()
    component?.focus?.()
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function save() {
    saving.value = true
    saveError.value = ''
    try {
      const payload = { ...form }
      if (session.user?.admin) payload.customer_id = customerId.value
      if (publicMode) {
        payload.contact = { ...contact, language: i18n.global.locale.value }
      }
      if (newCustomer.value) {
        payload.new_customer = { ...newContact, language: i18n.global.locale.value }
        payload.equipment = { ...guestEquipment }
        delete payload.equipment_id
      }
      if (isNew) delete payload.agency_commission
      const r = await api(publicMode ? 'book' : 'saveorder', payload)
      q.notify({ type: 'positive', message: t('orders.saved') })
      if (publicMode) {
        submitted.value = r.id
        activationSent.value = r.activation_sent !== false
      } else if (isNew) await router.replace('/servisi/' + r.id)
      else await load()
    } catch (e) {
      saveError.value = e.message
    } finally {
      saving.value = false
    }
  }
  async function resendActivation() {
    try {
      await api('resend', { mail: contact.mail })
      activationSent.value = true
      q.notify({ type: 'positive', message: t('auth.activationSent') })
    } catch (error) {
      q.notify({ type: 'negative', message: error.message })
    }
  }

  async function equipmentSaved(id) {
    try {
      equipment.value = await api('equipment')
      equipmentSearch.value = ''
      customerId.value = equipment.value.find(e => Number(e.id) === Number(id))?.customer_id || null
      form.equipment_id = Number(id)
    } catch (e) {
      saveError.value = e.message
    }
  }
  async function upload() {
    if (!uploadFile.value) return
    uploading.value = true
    documentError.value = ''
    try {
      const bytes = new Uint8Array(await uploadFile.value.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
      await api('upload', {
        order_id: form.id,
        kind: uploadKind.value,
        report_number: reportNumber.value,
        equipment_label: reportEquipment.value,
        serial: reportSerial.value,
        filename: uploadFile.value.name,
        content: btoa(binary)
      })
      documents.value = (await api('order/' + form.id)).documents
      uploadFile.value = null
    } catch (e) {
      documentError.value = e.message
    } finally {
      uploading.value = false
    }
  }
  async function download(doc) {
    documentError.value = ''
    try {
      const r = await fetch(`${API_URL}/servis/document/${doc.id}/`, { credentials: 'include' })
      if (!r.ok) throw new Error(t('errors.downloadFailed'))
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement('a')
      a.href = url
      a.download = doc.filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      documentError.value = e.message
      q.notify({ type: 'negative', message: e.message })
    }
  }
  async function addComment() {
    commenting.value = true
    commentError.value = ''
    try {
      await api('comment', { order_id: form.id, body: comment.value })
      comments.value = (await api('order/' + form.id)).comments
      comment.value = ''
    } catch (e) {
      commentError.value = e.message
    } finally {
      commenting.value = false
    }
  }
  async function removeDocument(doc) {
    documentError.value = ''
    try {
      await api('deletedocument', { id: doc.id })
      documents.value = documents.value.filter(item => item.id !== doc.id)
    } catch (error) {
      documentError.value = error.message
    }
  }

  function resetEmail() {
    email.mail = email.recipient === 'self' ? 'info@stenar.si' : owner.value?.mail || ''
    email.subject = t(email.recipient === 'self' ? 'email.internalSubject' : 'email.customerSubject')
    const paymentText = {
      pickup: 'email.payOnCollection',
      bank: 'email.payByBank',
      card: 'email.payByCard',
      paypal: 'email.payByPaypal'
    }
    const deliveryText = {
      post: 'email.postReturn',
      gls: 'email.glsReturn',
      personal: 'email.personalReturn',
      other: 'email.otherReturn'
    }
    email.message =
      email.recipient === 'self'
        ? t('email.greeting') + '\n\n' + t('email.internalMessage') + '\n\n' + t('email.signoff')
        : t('email.greeting') +
          '\n\n' +
          t('email.customerMessage') +
          '\n\n' +
          t(paymentText[form.payment_method]) +
          '\n\n' +
          t(deliveryText[form.delivery]) +
          '\n\n' +
          t('email.signoff') +
          '\nStenar.si'
  }

  async function sendDocuments() {
    sending.value = true
    emailError.value = ''
    try {
      await api('senddocuments', { ...email, order_id: form.id })
      q.notify({ type: 'positive', message: t('email.sent') })
    } catch (e) {
      emailError.value = e.message
    } finally {
      sending.value = false
    }
  }
  onMounted(load)
</script>
