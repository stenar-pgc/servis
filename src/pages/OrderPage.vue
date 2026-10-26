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
                  </div>
                  <CustomerSelect
                    v-else
                    v-model="customerId"
                    outlined
                    :customers="customers"
                    clearable
                    :label="$t('customers.customer')"
                    :hint="$t('customers.assignLater')" />
                </div>
                <div v-else class="row items-center no-wrap">
                  <q-avatar icon="person_outline" color="grey-2" text-color="primary" class="q-mr-md" />
                  <div>
                    <strong>{{ owner?.name || session.user?.name }}</strong>
                    <div class="text-grey-7 q-mt-xs">{{ owner?.mail || session.user?.mail }}</div>
                    <div v-if="owner?.phone" class="text-grey-7">
                      {{ owner.phone }}
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
                <template v-if="!session.user?.admin || newCustomer">
                  <div class="text-weight-medium q-mt-lg">{{ $t('contact.customerAddress') }}</div>
                  <PostalAddressFields
                    v-model:address="form.contact_address"
                    v-model:postal-code="form.contact_postal_code"
                    v-model:city="form.contact_city"
                    v-model:country="form.contact_country"
                    :required="!session.user?.admin && usesContactAddress"
                    :readonly="readonly"
                    class="q-mt-md" />
                </template>
                <template v-if="publicMode">
                  <q-checkbox v-model="contact.create_account" :label="$t('auth.wantAccount')" class="q-mt-md" />
                  <p v-if="contact.create_account" class="text-caption text-grey-7">
                    {{ $t('auth.activationSent') }}
                  </p>
                </template>
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
                <q-card v-for="block in deliveryAddresses" :key="block.prefix" flat bordered class="q-pa-md q-mt-md">
                  <div class="text-weight-medium q-mb-sm">{{ $t(block.title) }}</div>
                  <q-checkbox
                    v-model="form[block.prefix + '_same_address']"
                    :label="$t(block.sameLabel)"
                    :disable="readonly" />
                  <div v-if="form[block.prefix + '_same_address']" class="q-pa-md text-body2">
                    <strong>{{ contactName || $t('contact.fullName') }}</strong>
                    <div class="q-mt-xs">{{ form.contact_address || $t('contact.street') }}</div>
                    <div>
                      {{ form.contact_postal_code || $t('contact.postalCode') }}
                      {{ form.contact_city || $t('contact.city') }}
                    </div>
                    <div>{{ countryName(form.contact_country) }}</div>
                  </div>
                  <PostalAddressFields
                    v-else
                    v-model:name="form[block.prefix + '_name']"
                    v-model:address="form[block.prefix + '_address']"
                    v-model:postal-code="form[block.prefix + '_postal_code']"
                    v-model:city="form[block.prefix + '_city']"
                    v-model:country="form[block.prefix + '_country']"
                    with-name
                    :required="!session.user?.admin"
                    :readonly="readonly"
                    class="q-mt-md" />
                </q-card>
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
          <q-card
            v-if="session.user?.admin || (!isNew && (orderEquipment.length || unassignedReports.length))"
            flat
            bordered
            class="section-card">
            <h2 class="q-mb-lg">{{ $t('documents.equipmentReports') }} ({{ orderEquipment.length }})</h2>
            <div v-if="session.user?.admin" class="q-mb-lg">
              <q-select
                ref="equipmentSelect"
                v-model="equipmentToAdd"
                outlined
                use-input
                clearable
                :input-debounce="0"
                :options="filteredEquipmentOptions"
                emit-value
                map-options
                :label="$t('equipment.addExisting')"
                @filter="filterEquipment"
                @update:model-value="attachEquipment">
                <template #no-option>
                  <q-item>
                    <q-item-section>{{ $t('common.noResults') }}</q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-btn
                outline
                no-caps
                color="primary"
                icon="add"
                :label="$t('equipment.new')"
                class="q-mt-md"
                @click="addEquipment" />
            </div>
            <div v-if="!orderEquipment.length" class="text-grey-7">{{ $t('equipment.noneRegistered') }}</div>
            <div v-for="item in orderEquipment" :key="item.id" class="service-item equipment-report-row q-mb-md">
              <div>
                <div class="text-caption text-grey-7 q-mb-sm">{{ $t('equipment.title') }}</div>
                <div class="row items-start no-wrap">
                  <div class="col">
                    <strong>{{ equipmentLabel(item) }}</strong>
                    <div class="text-caption text-grey-7">
                      {{ translateText(item.type) }} · {{ item.serial || '—' }}
                    </div>
                  </div>
                  <template v-if="session.user?.admin">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      :aria-label="$t('equipment.edit')"
                      @click="editEquipment(item)" />
                    <q-btn
                      flat
                      round
                      dense
                      icon="close"
                      :aria-label="$t('equipment.removeFromOrder')"
                      :disable="reportsFor(item.id).length > 0"
                      @click="detachEquipment(item.id)">
                      <q-tooltip v-if="reportsFor(item.id).length">{{ $t('errors.removeEquipmentReports') }}</q-tooltip>
                    </q-btn>
                  </template>
                </div>
              </div>
              <div>
                <div class="text-caption text-grey-7 q-mb-sm">{{ $t('documents.reference') }}</div>
                <div v-for="number in reportReferences(item.id)" :key="number" class="q-mb-sm">{{ number }}</div>
                <q-input
                  v-if="session.user?.admin"
                  outlined
                  dense
                  v-model="reportNumbers[item.id]"
                  :label="$t('documents.reference')" />
                <div v-else-if="!reportReferences(item.id).length">—</div>
              </div>
              <div>
                <div class="text-caption text-grey-7 q-mb-sm">{{ $t('documents.files') }}</div>
                <DocumentFiles
                  :files="reportsFor(item.id)"
                  :editable="session.user?.admin"
                  @download="download"
                  @remove="removeDocument" />
                <div v-if="!reportsFor(item.id).length" class="text-caption text-grey-7 q-mb-sm">
                  {{ $t('documents.noReport') }}
                </div>
                <template v-if="session.user?.admin">
                  <q-file
                    outlined
                    dense
                    multiple
                    v-model="reportFiles[item.id]"
                    accept="application/pdf,.pdf"
                    :max-file-size="10485760"
                    :label="$t('documents.choosePdf')"
                    :disable="isNew || !savedEquipmentIds.includes(Number(item.id)) || uploading"
                    class="q-mt-sm"
                    @rejected="documentError = t('errors.pdfSize')" />
                  <q-btn
                    flat
                    no-caps
                    color="primary"
                    icon="upload_file"
                    :label="$t('documents.addReport')"
                    :disable="
                      isNew ||
                      !savedEquipmentIds.includes(Number(item.id)) ||
                      !reportFiles[item.id]?.length ||
                      uploading
                    "
                    class="q-mt-sm"
                    @click="uploadReports(item.id)" />
                  <div v-if="isNew || !savedEquipmentIds.includes(Number(item.id))" class="text-caption text-grey-7">
                    {{ $t('equipment.saveForReport') }}
                  </div>
                </template>
              </div>
            </div>
            <q-btn
              v-if="session.user?.admin"
              flat
              no-caps
              color="primary"
              icon="add_circle_outline"
              :label="$t('equipment.addExisting')"
              class="q-mb-md"
              @click="chooseEquipment" />
            <template v-if="unassignedReports.length">
              <h3 class="text-subtitle1">{{ $t('documents.unassignedReports') }}</h3>
              <div v-for="doc in unassignedReports" :key="doc.id" class="q-mb-md">
                <div class="text-caption text-grey-7">{{ doc.equipment_label }} {{ doc.serial }}</div>
                <DocumentFiles
                  :files="[doc]"
                  :editable="session.user?.admin"
                  @download="download"
                  @remove="removeDocument" />
                <div v-if="session.user?.admin" class="row items-center q-col-gutter-sm q-mt-xs">
                  <q-select
                    outlined
                    dense
                    v-model="reportAssignments[doc.id]"
                    :options="savedEquipmentOptions"
                    emit-value
                    map-options
                    :label="$t('documents.assignReport')"
                    class="col" />
                  <q-btn
                    flat
                    no-caps
                    color="primary"
                    :label="$t('common.save')"
                    :disable="!reportAssignments[doc.id]"
                    @click="assignReport(doc)" />
                </div>
              </div>
            </template>
            <ErrorBanner :message="documentError" class="q-mt-md" />
          </q-card>
          <q-card v-if="!isNew && (session.user?.admin || invoices.length)" flat bordered class="section-card">
            <h2>{{ $t('documents.invoice') }}</h2>
            <DocumentFiles
              :files="invoices"
              :editable="session.user?.admin"
              @download="download"
              @remove="removeDocument" />
            <div v-if="!invoices.length" class="text-grey-7 q-mt-md">{{ $t('documents.empty') }}</div>
            <q-btn
              v-if="session.user?.admin && !invoices.length"
              outline
              no-caps
              color="primary"
              icon="upload_file"
              :label="$t('documents.addInvoice')"
              class="q-mt-md"
              @click="openUpload('invoice')" />
            <q-btn
              v-if="session.user?.admin && editing"
              outline
              no-caps
              icon="note_add"
              :label="$t('orders.createInvoice')"
              disable
              class="full-width q-mt-md" />
          </q-card>
          <q-card v-if="session.user?.admin && documents.length" flat bordered class="section-card">
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
              {{ orderEquipment.map(equipmentLabel).join(', ') || $t('equipment.unassigned') }}
            </div>
            <div v-for="block in deliveryAddresses" :key="block.prefix" class="q-mt-sm">
              <strong>{{ $t(block.title) }}</strong>
              <div v-for="(line, index) in addressLines(block.prefix)" :key="index">{{ line }}</div>
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
    <q-dialog v-model="documentEditor">
      <q-card class="editor">
        <q-card-section class="row items-center">
          <h2>{{ $t(uploadKind === 'report' ? 'documents.addReport' : 'documents.addInvoice') }}</h2>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup :aria-label="$t('common.close')" />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <div v-if="uploadKind === 'report'" class="text-weight-medium">{{ equipmentLabel(uploadEquipment) }}</div>
          <q-input v-if="uploadKind === 'report'" outlined v-model="reportNumber" :label="$t('documents.reference')" />
          <q-file
            outlined
            v-model="uploadFile"
            accept="application/pdf,.pdf"
            :max-file-size="10485760"
            :label="$t('documents.choosePdf')"
            clearable
            @rejected="documentError = t('errors.pdfSize')" />
          <ErrorBanner :message="documentError" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps :label="$t('common.cancel')" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="upload_file"
            :label="$t('documents.upload')"
            :disable="!uploadFile"
            :loading="uploading"
            @click="upload" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <EquipmentEditor
      v-if="!publicMode"
      v-model="equipmentEditor"
      :customers="customers"
      :equipment="equipmentToEdit"
      :customer-id="newCustomer ? null : customerId"
      @saved="equipmentSaved" />
  </q-page>
</template>
<script setup>
  import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useQuasar } from 'quasar'
  import {
    API_URL,
    api,
    date,
    deliveries,
    money,
    orderNumber,
    paymentMethods,
    session,
    statuses
  } from '../services/api'
  import { t, i18n, translateText } from '../i18n'
  import PostalAddressFields from '../components/PostalAddressFields.vue'
  import { postalRate } from '../services/shipping'
  import CustomerSelect from '../components/CustomerSelect.vue'
  import ErrorBanner from '../components/ErrorBanner.vue'
  import EquipmentEditor from '../components/EquipmentEditor.vue'
  import DocumentFiles from '../components/DocumentFiles.vue'
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
    equipment_ids: [],
    description: '',
    status: 'submitted',
    delivery: 'personal',
    delivery_note: '',
    contact_address: '',
    contact_postal_code: '',
    contact_city: '',
    contact_country: 'SI',
    shipping_same_address: true,
    shipping_name: '',
    shipping_address: '',
    shipping_postal_code: '',
    shipping_city: '',
    shipping_country: 'SI',
    pickup_same_address: true,
    pickup_name: '',
    pickup_address: '',
    pickup_postal_code: '',
    pickup_city: '',
    pickup_country: 'SI',
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
    equipmentToEdit = ref(null),
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
  const newContact = reactive({ name: '', mail: '', phone: '' })
  const contact = reactive({ first: '', last: '', mail: '', phone: '', create_account: true })
  const submitted = ref(null)
  const activationSent = ref(true)
  const hasDiscount = ref(false)
  const review = ref(false)
  const agencies = ref([])
  const equipmentToAdd = ref(null)
  const documentEditor = ref(false)
  const reportEquipmentId = ref(null)
  const savedEquipmentIds = ref([])
  const reportAssignments = reactive({})
  const reportNumbers = reactive({})
  const reportFiles = reactive({})
  const reportReferences = id => [
    ...new Set(
      reportsFor(id)
        .map(doc => doc.report_number)
        .filter(Boolean)
    )
  ]
  const orderEquipment = computed(() =>
    form.equipment_ids.map(id => equipment.value.find(item => Number(item.id) === Number(id))).filter(Boolean)
  )
  const invoices = computed(() => documents.value.filter(doc => doc.kind === 'invoice'))
  const unassignedReports = computed(() => documents.value.filter(doc => doc.kind === 'report' && !doc.equipment_id))
  const uploadEquipment = computed(() =>
    equipment.value.find(item => Number(item.id) === Number(reportEquipmentId.value))
  )
  const reportsFor = id =>
    documents.value.filter(doc => doc.kind === 'report' && Number(doc.equipment_id) === Number(id))
  const equipmentLabel = item =>
    item ? `${item.manufacturer || ''} ${item.model || ''} ${item.size || ''}`.trim() || translateText(item.type) : ''
  const savedEquipmentOptions = computed(() =>
    orderEquipment.value
      .filter(item => savedEquipmentIds.value.includes(Number(item.id)))
      .map(item => ({ value: Number(item.id), label: equipmentLabel(item) }))
  )
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
      .filter(
        e =>
          !form.equipment_ids.includes(Number(e.id)) &&
          (newCustomer.value
            ? !e.customer_id
            : !customerId.value || !e.customer_id || Number(e.customer_id) === Number(customerId.value))
      )
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

  function attachEquipment(id) {
    if (!id) return
    const item = equipment.value.find(item => Number(item.id) === Number(id))
    if (!newCustomer.value && !customerId.value && item?.customer_id) customerId.value = Number(item.customer_id)
    form.equipment_ids = [...new Set([...form.equipment_ids, Number(id)])]
    equipmentToAdd.value = null
    equipmentSearch.value = ''
  }

  function detachEquipment(id) {
    form.equipment_ids = form.equipment_ids.filter(value => Number(value) !== Number(id))
  }

  function chooseEquipment() {
    equipmentSelect.value?.$el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    equipmentSelect.value?.focus()
    equipmentSelect.value?.showPopup()
  }

  function addEquipment() {
    equipmentToEdit.value = null
    equipmentSelect.value?.hidePopup()
    equipmentEditor.value = true
  }

  function editEquipment(item) {
    equipmentToEdit.value = item
    equipmentEditor.value = true
  }

  const owner = computed(
    () =>
      customers.value.find(item => Number(item.id) === Number(customerId.value)) ||
      (!session.user?.admin ? session.user : null)
  )
  const countryName = code => new Intl.DisplayNames([i18n.global.locale.value], { type: 'region' }).of(code || 'SI')
  const postalDelivery = computed(() => ['post', 'gls'].includes(form.delivery))
  const returnCountry = computed(() => (form.shipping_same_address ? form.contact_country : form.shipping_country))
  const contactName = computed(() =>
    publicMode
      ? [contact.first, contact.last].filter(Boolean).join(' ')
      : newCustomer.value
        ? newContact.name
        : owner.value?.name || ''
  )
  const usesContactAddress = computed(
    () => postalDelivery.value && (form.shipping_same_address || (form.delivery === 'gls' && form.pickup_same_address))
  )
  const deliveryAddresses = computed(() => [
    ...(form.delivery === 'gls'
      ? [{ prefix: 'pickup', title: 'delivery.pickupAddress', sameLabel: 'delivery.pickupSame' }]
      : []),
    ...(postalDelivery.value
      ? [{ prefix: 'shipping', title: 'delivery.returnAddress', sameLabel: 'delivery.returnSame' }]
      : [])
  ])
  function addressLines(prefix) {
    const same = form[prefix + '_same_address']
    const source = same ? 'contact' : prefix
    return [
      same ? contactName.value : form[prefix + '_name'],
      form[source + '_address'],
      [form[source + '_postal_code'], form[source + '_city']].filter(Boolean).join(' '),
      countryName(form[source + '_country'])
    ].filter(Boolean)
  }
  watch(
    customerId,
    () => {
      if (loading.value) return
      form.contact_address = owner.value?.address || ''
      form.contact_country = owner.value?.country || 'SI'
      form.contact_postal_code = owner.value?.postal_code || ''
      form.contact_city = owner.value?.city || ''
    },
    { flush: 'sync' }
  )
  watch(newCustomer, value => {
    if (loading.value) return
    form.contact_address = value ? '' : owner.value?.address || ''
    form.contact_country = value ? 'SI' : owner.value?.country || 'SI'
    form.contact_postal_code = value ? '' : owner.value?.postal_code || ''
    form.contact_city = value ? '' : owner.value?.city || ''
  })
  const translatedDeliveries = computed(() =>
    deliveries.map(d => ({
      ...d,
      label: t(d.label, { price: money(postalRate(returnCountry.value)) })
    }))
  )
  const translatedPayments = computed(() => paymentMethods.map(p => ({ ...p, label: t(p.label) })))
  const translatedStatuses = computed(() => statuses.map(s => ({ ...s, label: t(s.label) })))
  const price = item => Number(acceptedPrices.value[item.code] ?? item.price)
  const selectedItems = computed(() =>
    catalog.value
      .filter(i => Number(form.quantities[i.code]) > 0)
      .map(i => ({ ...i, quantity: Number(form.quantities[i.code]) }))
  )
  const shipping = computed(() =>
    form.delivery === 'post' ? postalRate(returnCountry.value) : form.delivery === 'gls' ? 10 : 0
  )
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
        form.contact_address = session.user?.admin ? '' : session.user?.address || ''
        form.contact_country = session.user?.admin ? 'SI' : session.user?.country || 'SI'
        form.contact_postal_code = session.user?.admin ? '' : session.user?.postal_code || ''
        form.contact_city = session.user?.admin ? '' : session.user?.city || ''
        form.equipment_ids = route.query.equipment ? [Number(route.query.equipment)] : []
        customerId.value = orderEquipment.value[0]?.customer_id || null
        if (customerId.value) {
          form.contact_address = owner.value?.address || ''
          form.contact_country = owner.value?.country || 'SI'
          form.contact_postal_code = owner.value?.postal_code || ''
          form.contact_city = owner.value?.city || ''
        }
      } else {
        newCustomer.value = false
        const order = await api('order/' + route.params.id)
        Object.assign(form, order, {
          equipment_ids: (order.equipment_ids || (order.equipment_id ? [order.equipment_id] : [])).map(Number),
          shipping_same_address: order.shipping_same_address == null || !!Number(order.shipping_same_address),
          pickup_same_address: order.pickup_same_address == null || !!Number(order.pickup_same_address),
          english_report: !!Number(order.english_report),
          finance_complete: !!Number(order.finance_complete),
          discount_code: ''
        })
        customerId.value = order.customer_id ? Number(order.customer_id) : null
        savedEquipmentIds.value = [...form.equipment_ids]
        if (!session.user?.admin && order.equipment) equipment.value = order.equipment
        acceptedPrices.value = {}
        for (const item of order.items) {
          form.quantities[item.service_code] = Number(item.quantity)
          acceptedPrices.value[item.service_code] = Number(item.unit_price)
        }
        documents.value = order.documents
        comments.value = order.comments || []
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
        payload.contact = {
          ...contact,
          address: form.contact_address,
          country: form.contact_country,
          postal_code: form.contact_postal_code,
          city: form.contact_city,
          language: i18n.global.locale.value
        }
      }
      if (newCustomer.value) {
        payload.new_customer = {
          ...newContact,
          address: form.contact_address,
          country: form.contact_country,
          postal_code: form.contact_postal_code,
          city: form.contact_city,
          language: i18n.global.locale.value
        }
        payload.equipment_ids = [...form.equipment_ids]
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
      attachEquipment(id)
    } catch (e) {
      saveError.value = e.message
    }
  }
  function openUpload(kind, equipmentId = null) {
    uploadKind.value = kind
    reportEquipmentId.value = equipmentId
    reportNumber.value = ''
    uploadFile.value = null
    documentError.value = ''
    documentEditor.value = true
  }

  async function assignReport(doc) {
    documentError.value = ''
    try {
      await api('assigndocument', { id: doc.id, equipment_id: reportAssignments[doc.id] })
      documents.value = (await api('order/' + form.id)).documents
    } catch (error) {
      documentError.value = error.message
    }
  }

  async function uploadReports(equipmentId) {
    const files = [...(reportFiles[equipmentId] || [])]
    uploadKind.value = 'report'
    reportEquipmentId.value = equipmentId
    reportNumber.value = reportNumbers[equipmentId] || reportReferences(equipmentId)[0] || ''
    for (const file of files) {
      uploadFile.value = file
      if (!(await upload())) return
      reportFiles[equipmentId] = reportFiles[equipmentId].filter(item => item !== file)
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
        equipment_id: uploadKind.value === 'report' ? reportEquipmentId.value : null,
        filename: uploadFile.value.name,
        content: btoa(binary)
      })
      documents.value = (await api('order/' + form.id)).documents
      uploadFile.value = null
      documentEditor.value = false
      return true
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
